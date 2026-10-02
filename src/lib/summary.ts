// 회차(스냅숏) 한 장을 사람이 읽는 요약으로 — 프로필 화면과 AI 자료가 함께 쓴다
import { AXES, AXIS_KEYS, type AxisKey } from '../data/values/items';
import type { AttachState, MbtiState, TemperState } from '../store/useStore';
import type { ModuleKey, Snapshot } from './history';
import { fullResult, type FullResult } from './values/scoring';
import { ro } from './josa';

export const TEMPER_NAME = { NS: '자극 추구', HA: '위험 회피', RD: '사회적 민감성', P: '인내력' } as const;
const MBTI_DIMS = ['EI', 'SN', 'TF', 'JP'] as const;

const cache = new WeakMap<object, FullResult>();
export function valuesResult(s: Snapshot): FullResult | null {
  if (!s.values) return null;
  let r = cache.get(s.values);
  if (!r) { r = fullResult(s.values); cache.set(s.values, r); }
  return r;
}

export const mbtiText = (m?: MbtiState) => (m ? MBTI_DIMS.map(d => m.letters[d] ?? '?').join('') : '');
export function mbtiDetail(m?: MbtiState) {
  if (!m) return '';
  const p = MBTI_DIMS.filter(d => m.pct[d] !== undefined).map(d => `${m.letters[d]} ${m.pct[d]}%`);
  return p.join(' · ');
}
export function attachText(a?: AttachState) {
  if (!a) return '';
  return a.style ?? '점수만 입력';
}
export function attachDetail(a?: AttachState) {
  if (!a) return '';
  return [a.anxiety !== undefined ? `불안 ${a.anxiety}%` : '', a.avoidance !== undefined ? `회피 ${a.avoidance}%` : ''].filter(Boolean).join(' · ');
}
const lvl = (x: number) => (x >= 65 ? '높음' : x <= 35 ? '낮음' : '보통');
export function temperText(t?: TemperState) {
  if (!t) return '';
  const e = Object.entries(t.pct).filter(([, x]) => x !== undefined) as [keyof typeof TEMPER_NAME, number][];
  if (!e.length) return '';
  const top = [...e].sort((a, b) => Math.abs(b[1] - 50) - Math.abs(a[1] - 50))[0];
  return `${TEMPER_NAME[top[0]]} ${lvl(top[1])}`;
}
export function temperDetail(t?: TemperState) {
  if (!t) return '';
  return (Object.entries(t.pct).filter(([, x]) => x !== undefined) as [keyof typeof TEMPER_NAME, number][]).map(([k, x]) => `${TEMPER_NAME[k]} ${x}%`).join(' · ');
}

export function moduleTitle(m: ModuleKey, s: Snapshot): string {
  if (m === 'values') return valuesResult(s)?.type.name ?? '';
  if (m === 'mbti') return mbtiText(s.mbti);
  if (m === 'attach') return attachText(s.attach);
  return temperText(s.temper);
}

/** 지난 회차 대비 달라진 점 (사람이 읽는 문장) */
export function diffLines(prev: Snapshot, cur: Snapshot): string[] {
  const L: string[] = [];
  const a = valuesResult(prev), b = valuesResult(cur);
  if (a && b && JSON.stringify(prev.values) !== JSON.stringify(cur.values)) {
    if (a.type.name !== b.type.name) L.push(`가치관 유형이 ${a.type.name}에서 ${ro(b.type.name)} 바뀌었어요.`);
    for (const k of AXIS_KEYS) {
      const x = Math.round(a.ax[k].score), y = Math.round(b.ax[k].score);
      if (a.ax[k].band !== b.ax[k].band) L.push(`${AXES[k].name}: ${a.ax[k].band} → ${b.ax[k].band}`);
      else if (Math.abs(y - x) >= 25) L.push(`${AXES[k].name}: 같은 쪽이지만 ${y > x ? AXES[k].R : AXES[k].L} 쪽으로 꽤 움직였어요.`);
    }
    if (a.type.name === b.type.name && L.length === 0) L.push('가치관을 다시 했지만 큰 변화는 없었어요.');
  }
  const m1 = mbtiText(prev.mbti), m2 = mbtiText(cur.mbti);
  if (m1 && m2 && m1 !== m2) L.push(`MBTI가 ${m1}에서 ${m2}(으)로 바뀌었어요.`);
  if (prev.attach?.style && cur.attach?.style && prev.attach.style !== cur.attach.style) L.push(`애착 유형이 ${prev.attach.style}에서 ${ro(cur.attach.style)} 바뀌었어요.`);
  for (const k of Object.keys(TEMPER_NAME) as (keyof typeof TEMPER_NAME)[]) {
    const x = prev.temper?.pct[k], y = cur.temper?.pct[k];
    if (x !== undefined && y !== undefined && Math.abs(y - x) >= 15) L.push(`기질 ${TEMPER_NAME[k]}: ${x}% → ${y}%`);
  }
  return L;
}

/** 회차의 가치관 축 점수 (그래프용) */
export function axisSeries(history: Snapshot[]): { idx: number; scores: Record<AxisKey, number> }[] {
  return history.map((s, idx) => ({ idx, r: valuesResult(s) })).filter(x => x.r)
    .map(({ idx, r }) => ({ idx, scores: Object.fromEntries(AXIS_KEYS.map(k => [k, r!.ax[k].score])) as Record<AxisKey, number> }));
}
