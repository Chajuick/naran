// 공개 검사 3종 채점 — 원문 채점식 그대로 (docs/instruments/sources.md)
// 응답 저장 형식: 문항 id → 1~points (OEJTS 1=왼쪽, 5=오른쪽 / Likert 1=전혀 아니에요)
import { ECRR_ITEMS, TEMPER_ITEMS } from '../../data/tests/defs';
import type { AttachState, AttachStyle, MbtiState, TemperState } from '../../store/useStore';

type Ans = Record<string, number>;

/** OEJTS 1.2 채점식. 각 지표 8~40, 24 초과면 뒤 글자(E/N/T/P) */
export function oejtsRaw(a: Ans) {
  const q = (n: number) => a[`Q${n}`];
  return {
    IE: 30 - q(3) - q(7) - q(11) + q(15) - q(19) + q(23) + q(27) - q(31),
    SN: 12 + q(4) + q(8) + q(12) + q(16) + q(20) - q(24) - q(28) + q(32),
    FT: 30 - q(2) + q(6) + q(10) - q(14) - q(18) + q(22) - q(26) - q(30),
    JP: 18 + q(1) + q(5) - q(9) + q(13) - q(17) + q(21) - q(25) + q(29),
  };
}

/** MbtiState 로 변환: 고른 글자 쪽 % (기준 24에서 떨어진 정도를 50~100으로) — 백분위 아님 */
export function oejtsToMbti(a: Ans): MbtiState {
  const r = oejtsRaw(a);
  const dims = [['EI', r.IE, 'E', 'I'], ['SN', r.SN, 'N', 'S'], ['TF', r.FT, 'T', 'F'], ['JP', r.JP, 'P', 'J']] as const;
  const letters: MbtiState['letters'] = {}, pct: MbtiState['pct'] = {};
  for (const [d, s, hi, lo] of dims) {
    letters[d] = s > 24 ? hi : lo;
    pct[d] = Math.round(50 + (Math.abs(s - 24) / 16) * 50);
  }
  return { letters, pct, source: 'oejts', raw: r };
}

function likertMean(items: typeof ECRR_ITEMS, a: Ans, scale: string, points: number) {
  const xs = items.filter(i => i.scale === scale).map(i => (i.key === 1 ? a[i.id] : points + 1 - a[i.id]));
  return xs.reduce((s, x) => s + x, 0) / xs.length;
}

/** ECR-R: 역문항 8 − 응답, 하위척도 평균 1~7. 유형은 척도 중간(4) 초과 여부로만 (국내 규준 없음) */
export function ecrrToAttach(a: Ans): AttachState {
  const anx = likertMean(ECRR_ITEMS, a, 'anx', 7), avo = likertMean(ECRR_ITEMS, a, 'avo', 7);
  const hiA = anx > 4, hiV = avo > 4;
  const style: AttachStyle = hiA && hiV ? '혼란형' : hiA ? '불안형' : hiV ? '회피형' : '안정형';
  const pct = (m: number) => Math.round(((m - 1) / 6) * 100);
  return { style, anxiety: pct(anx), avoidance: pct(avo), source: 'ecrr', raw: { anx: +anx.toFixed(2), avo: +avo.toFixed(2) } };
}

/** 기질: 역문항 6 − 응답, 차원별 8문항 평균 1~5 → 0~100 */
export function temperFromAnswers(a: Ans): TemperState {
  const pct: TemperState['pct'] = {};
  for (const d of ['NS', 'HA', 'RD', 'P'] as const) pct[d] = Math.round(((likertMean(TEMPER_ITEMS, a, d, 5) - 1) / 4) * 100);
  return { pct, source: 'ipip' };
}
