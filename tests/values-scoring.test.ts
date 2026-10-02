// 회귀 테스트: 앱 채점이 prototype/values-test.html v0.4.5 와 같은 결과를 내는지 (제3세트 28명, docs/06)
// 주의: 타이브레이크(viceTie/traitTie) 응답은 픽스처에 없다 — 시험판 채점 때도 없었다.
import { describe, expect, it } from 'vitest';
import fixtures from './fixtures/set3-prototype.json';
import { fullResult, scoreAxes, typeOf, type ValuesAnswers } from '../src/lib/values/scoring';
import { AXIS_KEYS } from '../src/data/values/items';

type Fx = { ans: Record<string, number>; md: ValuesAnswers['md']; expectScores: number[]; expectHeadline: string };
const FX = fixtures as unknown as Record<string, Fx>;

describe('나란 채점 = 시험판 v0.4.5', () => {
  for (const [n, fx] of Object.entries(FX)) {
    it(`${n}번 축 점수와 헤드라인`, () => {
      const r = fullResult({ ans: fx.ans, md: fx.md });
      expect(AXIS_KEYS.map(k => Math.round(r.ax[k].score))).toEqual(fx.expectScores);
      expect(r.narrative.headline.join(' ')).toBe(fx.expectHeadline);
    });
  }
});

describe('유형 규칙 (docs/06 B안)', () => {
  it('58번: 책임+자율+솔직+헤아림 → 따뜻한 원칙형 (A2)', () => {
    const fx = FX['58'];
    expect(typeOf(scoreAxes({ ans: fx.ans, md: fx.md })).code).toBe('A2');
  });
  it('63번: 경계 0 → 조율형, 표현 균형이라 수식어 없음', () => {
    const fx = FX['63'];
    const t = typeOf(scoreAxes({ ans: fx.ans, md: fx.md }));
    expect(t.code).toBe('E');
    expect(t.name).toBe('조율형');
  });
  it('77번: 이해+보살핌+조화+헤아림 → 포근한 돌봄형 (D4)', () => {
    const fx = FX['77'];
    expect(typeOf(scoreAxes({ ans: fx.ans, md: fx.md })).name).toBe('포근한 돌봄형');
  });
});
