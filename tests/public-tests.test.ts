import { describe, expect, it } from 'vitest';
import { ECRR_ITEMS, OEJTS_ITEMS, TEMPER_ITEMS } from '../src/data/tests/defs';
import { ecrrToAttach, oejtsRaw, oejtsToMbti, temperFromAnswers } from '../src/lib/tests/scoring';

const all = (items: { id: string }[], v: number) => Object.fromEntries(items.map(i => [i.id, v]));

describe('문항 수·역채점 표시 (docs/instruments/translation-final.md)', () => {
  it('OEJTS 32 / ECR-R 36 / 기질 32', () => {
    expect(OEJTS_ITEMS).toHaveLength(32);
    expect(ECRR_ITEMS).toHaveLength(36);
    expect(TEMPER_ITEMS).toHaveLength(32);
  });
  it('ECR-R 역문항: 불안 7·9, 회피 2·4·8~13·15~18 (원문과 동일)', () => {
    const rev = ECRR_ITEMS.filter(i => i.key === -1).map(i => i.id);
    expect(rev).toEqual(['ANX7', 'ANX9', 'AVO2', 'AVO4', 'AVO8', 'AVO9', 'AVO10', 'AVO11', 'AVO12', 'AVO13', 'AVO15', 'AVO16', 'AVO17', 'AVO18']);
  });
  it('기질 차원별 8문항, 정·역 5:3', () => {
    for (const d of ['NS', 'HA', 'RD', 'P']) {
      const xs = TEMPER_ITEMS.filter(i => i.scale === d);
      expect(xs).toHaveLength(8);
      expect(xs.filter(i => i.key === -1)).toHaveLength(d === 'NS' ? 4 : 3);
    }
  });
});

describe('OEJTS 채점식 (원문)', () => {
  it('모두 3(반반)이면 네 지표 모두 24 → I·S·F·J, 50%', () => {
    const r = oejtsRaw(all(OEJTS_ITEMS, 3));
    expect(r).toEqual({ IE: 24, SN: 24, FT: 24, JP: 24 });
    const m = oejtsToMbti(all(OEJTS_ITEMS, 3));
    expect(Object.values(m.letters).join('')).toBe('ISFJ');
    expect(m.pct.EI).toBe(50);
  });
  it('외향 쪽으로 최대 응답이면 IE=40 → E 100%', () => {
    const a = all(OEJTS_ITEMS, 3);
    for (const q of [3, 7, 11, 19, 31]) a[`Q${q}`] = 1;
    for (const q of [15, 23, 27]) a[`Q${q}`] = 5;
    expect(oejtsRaw(a).IE).toBe(40);
    const m = oejtsToMbti(a);
    expect(m.letters.EI).toBe('E');
    expect(m.pct.EI).toBe(100);
  });
});

describe('ECR-R 채점 (역문항 8 − 응답, 평균)', () => {
  it('모두 4면 불안·회피 4.0 → 안정형(중간 초과 아님), 50%', () => {
    const r = ecrrToAttach(all(ECRR_ITEMS, 4));
    expect(r.raw).toEqual({ anx: 4, avo: 4 });
    expect(r.style).toBe('안정형');
    expect(r.anxiety).toBe(50);
  });
  it('모두 7이면 불안 높고(역 2문항만 1) 회피 낮음(역 12문항이 1) → 불안형', () => {
    const r = ecrrToAttach(all(ECRR_ITEMS, 7));
    expect(r.raw!.anx).toBeCloseTo((16 * 7 + 2) / 18, 2);
    expect(r.raw!.avo).toBeCloseTo((6 * 7 + 12) / 18, 2);
    expect(r.style).toBe('불안형');
  });
});

describe('기질 채점 (역문항 6 − 응답, 0~100)', () => {
  it('모두 3이면 네 차원 50%', () => {
    expect(temperFromAnswers(all(TEMPER_ITEMS, 3)).pct).toEqual({ NS: 50, HA: 50, RD: 50, P: 50 });
  });
  it('정문항 5·역문항 1이면 100%', () => {
    const a = Object.fromEntries(TEMPER_ITEMS.map(i => [i.id, i.key === 1 ? 5 : 1]));
    expect(temperFromAnswers(a).pct).toEqual({ NS: 100, HA: 100, RD: 100, P: 100 });
  });
});

import { shuffledOrder } from '../src/pages/PublicTest';
describe('문항 순서 섞기', () => {
  it('모든 문항이 한 번씩, 원래 순서와 다르고, 같은 척도 3연속이 (거의) 없다', () => {
    for (const kind of ['oejts', 'ecrr', 'temper'] as const) {
      for (let t = 0; t < 20; t++) {
        const o = shuffledOrder(kind);
        const ids = (kind === 'oejts' ? OEJTS_ITEMS : kind === 'ecrr' ? ECRR_ITEMS : TEMPER_ITEMS).map(i => i.id);
        expect([...o].sort()).toEqual([...ids].sort());
        expect(o).not.toEqual(ids);
        if (kind !== 'oejts') {
          const sc = (id: string) => (kind === 'ecrr' ? ECRR_ITEMS : TEMPER_ITEMS).find(i => i.id === id)!.scale;
          // 마지막 몇 문항은 남은 척도가 하나뿐이면 불가피 — 앞 80%만 검사
          const head = o.slice(0, Math.floor(o.length * 0.8));
          expect(head.some((id, i) => i >= 2 && sc(id) === sc(head[i - 1]) && sc(id) === sc(head[i - 2]))).toBe(false);
        }
      }
    }
  });
});
