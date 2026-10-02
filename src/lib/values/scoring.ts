// 나란 가치검사 채점 — 순수함수. prototype/values-test.html v0.4.5 와 같은 결과를 내야 한다 (tests/values-scoring.test.ts)
import { AXES, AXIS_KEYS, ITEMS, ORDER, POLE, POOLS, TRAITS, TRIAL, type AxisKey, type Pool, type Weight } from '../../data/values/items';
import { BALANCED_TEXT, FOLD_TEXT, IND_TEXT, NORM, NORM_SD, PAIR_NAME, PATTERN_TEXT, POLE_TEXT, TRAIT_PHRASE, VICE_PHRASE, type FeatText, type FoldVariant } from '../../data/values/texts';
import { FAMILY, FAMILY_BY_POLES, MODIFIER, MOD_BY_POLES, type FamilyKey, type ModKey } from '../../data/values/types';
import { josa } from '../josa';

export interface MdPick { w?: string; b?: string }
export interface TieRec { ids: string[]; need: number; picks: string[] }
export interface ValuesAnswers {
  /** 문항 id → sjt: 원래 선택지 번호 / slider: 0~4 */
  ans: Record<string, number>;
  /** vice0..5, trait0..3 → MdPick / viceTie, traitTie → TieRec */
  md: Record<string, MdPick | TieRec | undefined>;
}

export type Level = 'bal' | 'mild' | 'strong';
export interface AxisResult { score: number; band: string; conf: string; level: Level; pole: string; desc: string }
export type AxisResults = Record<AxisKey, AxisResult>;

export function weightsOf(id: string, v: number): Weight[] {
  const it = ITEMS[id];
  if (it.type === 'sjt') return it.opts[v][1];
  if (v === 2) return [];
  return v < 2 ? [[it.L[1], 2 - v]] : [[it.R[1], v - 2]];
}

export function signedOnAxis(id: string, v: number): number {
  let s = 0;
  for (const [p, n] of weightsOf(id, v)) { const [ax, sg] = POLE[p]; if (ax === ITEMS[id].axis) s += sg * n; }
  return s;
}

export function scoreAxes(a: ValuesAnswers): AxisResults {
  const raw = {} as Record<AxisKey, number>, dirs = {} as Record<AxisKey, number[]>, valid = {} as Record<AxisKey, number>;
  for (const k of AXIS_KEYS) { raw[k] = 0; dirs[k] = []; valid[k] = 0; }
  for (const id of ORDER) {
    const v = a.ans[id]; if (v === undefined) continue;
    const own = ITEMS[id].axis as AxisKey;
    const sv = signedOnAxis(id, v);
    raw[own] += sv; valid[own]++;
    dirs[own].push(Math.sign(sv));
  }
  const out = {} as AxisResults;
  for (const k of AXIS_KEYS) {
    const score = valid[k] ? Math.max(-100, Math.min(100, raw[k] / (2 * valid[k]) * 100)) : 0;
    const nz = dirs[k].filter(x => x !== 0);
    const pos = nz.filter(x => x > 0).length, agree = Math.max(pos, nz.length - pos);
    let conf = '상황에 따라 달라요';
    if (nz.length >= 3 && agree === nz.length) conf = '답이 한쪽으로 모였어요';
    else if (nz.length >= 3 && agree === nz.length - 1) conf = '대체로 그쪽이에요';
    const ax = AXES[k], abs = Math.abs(score), pole = score < 0 ? ax.L : ax.R;
    const level: Level = abs < 20 ? 'bal' : abs >= 60 ? 'strong' : 'mild';
    const band = level === 'bal' ? `${ax.L}과 ${ax.R} 사이` : `${level === 'strong' ? '뚜렷하게' : '약간'} ${pole} 쪽`;
    const desc = (level === 'bal' ? BALANCED_TEXT[k] : POLE_TEXT[pole][level]) + (conf === '상황에 따라 달라요' && level !== 'bal' ? ' 다만 상황에 따라 판단이 꽤 달라져요.' : '');
    out[k] = { score, band, conf, level, pole, desc };
  }
  return out;
}

function baseMd(a: ValuesAnswers, pool: Pool): Record<string, number> {
  const P = POOLS[pool], sc: Record<string, number> = {};
  for (const id in P.cards) sc[id] = 0;
  P.sets.forEach((_, i) => {
    const m = a.md[pool + i] as MdPick | undefined; if (!m) return;
    if (m.w) sc[m.w] += 0.5;
    if (m.b) sc[m.b] -= 0.5;
  });
  return sc;
}

/** 상위 K개 경계에서 동점이면 순위 정하기 화면이 필요 */
export function tieInfo(a: ValuesAnswers, pool: Pool): { ids: string[]; need: number } | null {
  const sc = baseMd(a, pool), K = POOLS[pool].top;
  const sorted = Object.entries(sc).sort((x, y) => y[1] - x[1]);
  const edge = sorted[K - 1][1];
  const above = sorted.filter(([, v]) => v > edge).length;
  const ids = sorted.filter(([, v]) => v === edge).map(([id]) => id).sort();
  const need = K - above;
  if (ids.length <= need) return null;
  return { ids, need: Math.min(need, 3) };
}

export type Ranked = [id: string, score: number][];
export function scoreMd(a: ValuesAnswers, pool: Pool): Ranked {
  const sc = baseMd(a, pool), r = a.md[pool + 'Tie'] as TieRec | undefined;
  if (r) r.picks.forEach((id, i) => { sc[id] += 0.1 * (r.picks.length - i) / r.picks.length; });
  return Object.entries(sc).sort((x, y) => y[1] - x[1]);
}

export type MirrorKind = 'lenient' | 'strict' | 'same';
export interface MirrorResult { d: number; ds: number[]; kind: MirrorKind; label: string; note: string }
const MIRROR_PAIRS: [string, string, 1 | -1][] = [['M1', 'V03', 1], ['M2', 'V04', 1], ['M3', 'O3', -1], ['M4', 'O4', 1]];

export function mirrorIndex(a: ValuesAnswers): MirrorResult {
  const used = MIRROR_PAIRS.filter(([m, o]) => a.ans[m] !== undefined && a.ans[o] !== undefined);
  const ds = used.map(([m, o, lenient]) => lenient * (signedOnAxis(m, a.ans[m]) - signedOnAxis(o, a.ans[o])));
  const d = ds.reduce((x, y) => x + y, 0) / (ds.length || 1);
  // 슬라이더 1~2칸 차이는 재검사 오차 수준 → 4쌍 중 3쌍 이상이 같은 방향일 때만 판정
  const pos = ds.filter(x => x > 0).length, neg = ds.filter(x => x < 0).length;
  const kind: MirrorKind = pos >= 3 ? 'lenient' : neg >= 3 ? 'strict' : 'same';
  // 'lenient'는 '나에게 너그러움'이 아니라 '남에게 거는 기대가 더 큼' — 도덕적 판단을 붙이지 않는다
  const label = { lenient: '남에게 거는 기대가 나에게 거는 기대보다 큰 편이에요', strict: '같은 상황이면 남보다 나에게 더 엄격한 편이에요', same: '나와 남에게 비슷한 기준을 써요' }[kind];
  const strictAt = used.filter((_, i) => ds[i] <= -2).map(([m]) => PAIR_NAME[m]);
  const lenientAt = used.filter((_, i) => ds[i] >= 2).map(([m]) => PAIR_NAME[m]);
  let note = '';
  if (kind === 'same' && strictAt.length) note = ` 다만 ${strictAt.join(', ')} 같은 상황에선 남보다 자신에게 더 엄격했어요.`;
  else if (kind === 'same' && lenientAt.length) note = ` 다만 ${lenientAt.join(', ')} 같은 상황에선 남에게 거는 기대가 더 컸어요.`;
  else if (kind === 'same' && neg >= 2 && pos === 0) note = ' 다만 내 일일 때 조금씩 더 엄격하게 보는 경향이 있어요.';
  else if (kind === 'same' && pos >= 2 && neg === 0) note = ' 다만 남의 일일 때 조금씩 더 기대하는 경향이 있어요.';
  return { d, ds, kind, label, note };
}

const pick = (r: Ranked, id: string) => (r.find(([x]) => x === id) || [id, 0])[1];

/** 공정 카드: 이중잣대 민감도 + '같은 기준' 중시 + 실제 기준 일관성 */
export function fairness(vices: Ranked, traits: Ranked, mi: MirrorResult) {
  const vS = pick(vices, 'C05'), tS = pick(traits, 'T04');
  const vLabel = vS >= 0.5 ? '특히 거슬려 해요' : vS <= -0.5 ? '다른 행동보다는 덜 거슬려 해요' : '다른 행동들과 비슷하게 거슬려 해요';
  const tLabel = tS >= 0.5 ? '가장 먼저 보는 것 중 하나예요' : tS <= -0.5 ? '다른 것보다 덜 봐요' : '중간 정도로 봐요';
  const sensitive = vS >= 0.5;
  const summary = sensitive
    ? { same: '이중잣대에 민감하고, 실제로도 나와 남에게 비슷한 기준을 써요.', strict: '이중잣대에 민감하고, 같은 상황이면 오히려 자신에게 더 엄격해요.', lenient: '이중잣대에 민감하면서도, 같은 상황에선 남에게 거는 기대가 조금 더 커요.' }[mi.kind]
    : { same: '나와 남에게 비슷한 기준을 써요.', strict: '남의 사정은 봐주면서, 같은 상황의 자신에게는 더 엄격해요.', lenient: '같은 상황이라도 남에게 거는 기대가 나에게 거는 기대보다 조금 커요.' }[mi.kind];
  return { vS, tS, vLabel, tLabel, sensitive, summary: summary + (mi.note || '') };
}

export function trialScore(a: ValuesAnswers) {
  const done = TRIAL.filter(id => a.ans[id] !== undefined);
  const raw = done.reduce((t, id) => t + signedOnAxis(id, a.ans[id]), 0);
  return { raw, n: done.length, label: raw <= -3 ? '수평' : raw >= 3 ? '연륜' : '균형' };
}

/** 보조 지표 (카드 응답에서 파생 — docs/06): 상호성 / 직접성 / 수정성 */
export function indicators(vices: Ranked, traits: Ranked, mi: MirrorResult) {
  const v = (id: string) => pick(vices, id), t = (id: string) => pick(traits, id);
  return {
    recip: (v('C05') + t('T04')) / 2 - (mi.kind === 'lenient' ? 0.5 : 0),
    direct: v('C07'),
    repair: (t('T06') + v('C02') + v('C13')) / 3,
  };
}

/** '삭임'은 동기가 다르다 — 함께 나온 축으로 구분 (docs/06) */
export function foldVariant(ax: AxisResults, mi: MirrorResult): FoldVariant {
  if (mi.kind === 'lenient') return 'expect';
  if (ax.BOUND.pole === '자율' && ax.BOUND.level !== 'bal' && ax.RESP.pole === '책임' && ax.RESP.level !== 'bal') return 'distance';
  if (ax.EMO.pole === '헤아림' && ax.EMO.level !== 'bal' && ax.BOUND.pole === '보살핌' && ax.BOUND.level !== 'bal') return 'relation';
  return 'mood';
}

export interface TypeResult {
  family: FamilyKey; mod: ModKey | null; code: string;
  name: string; tagline: string; desc: string; modDesc: string | null;
}
export function typeOf(ax: AxisResults): TypeResult {
  const family: FamilyKey = ax.RESP.level !== 'bal' && ax.BOUND.level !== 'bal' ? FAMILY_BY_POLES[ax.RESP.pole + ax.BOUND.pole] : 'E';
  const mod: ModKey | null = ax.CANDOR.level !== 'bal' && ax.EMO.level !== 'bal' ? MOD_BY_POLES[ax.CANDOR.pole + ax.EMO.pole] : null;
  const F = FAMILY[family], M = mod ? MODIFIER[mod] : null;
  return { family, mod, code: family + (mod ?? ''), name: (M ? M.name + ' ' : '') + F.name, tagline: F.tagline, desc: F.desc, modDesc: M?.desc ?? null };
}

interface Feat { kind: string; k: string; sal: number; text: FeatText }
export interface Narrative { headline: string[]; points: [string, string][]; good: string[]; care: string[] }

export function buildNarrative(ax: AxisResults, vices: Ranked, traits: Ranked, mi: MirrorResult): Narrative {
  const ind = indicators(vices, traits, mi);
  const axisFeat: Feat[] = AXIS_KEYS.flatMap(k => {
    const r = ax[k], dev = r.score - NORM[k];
    const ok = r.level !== 'bal' && Math.sign(dev) === Math.sign(r.score);
    return ok ? [{ kind: 'axis', k, sal: Math.abs(dev) / NORM_SD, text: POLE_TEXT[r.pole] }] : [];
  });
  const indFeat: Feat[] = (Object.keys(ind) as (keyof typeof ind)[]).filter(k => ind[k] >= 0.5).map(k => ({ kind: 'ind', k, sal: (ind[k] - 0.25) * 1.6, text: IND_TEXT[k] }));
  const folds = ind.direct <= -0.5 && ax.CANDOR.pole === '조화' && ax.CANDOR.level !== 'bal';
  const fv = foldVariant(ax, mi);
  const special: Feat[] = [];
  if (folds) special.push({ kind: 'pattern', k: 'folds', sal: 1.3, text: FOLD_TEXT[fv] });
  const balCount = AXIS_KEYS.filter(k => ax[k].level === 'bal').length;
  if (balCount >= 2) special.push({ kind: 'pattern', k: 'integrate', sal: 1.4, text: PATTERN_TEXT.integrate });
  if (pick(traits, 'T07') + pick(traits, 'T10') >= 0.5) special.push({ kind: 'pattern', k: 'doer', sal: 1.1, text: PATTERN_TEXT.doer });
  if (mi.kind === 'lenient') special.push({ kind: 'pattern', k: 'expect', sal: 1.25, text: PATTERN_TEXT.expect });
  if (mi.kind === 'strict') special.push({ kind: 'pattern', k: 'strict', sal: 0.9, text: PATTERN_TEXT.strict });
  // 축 방향은 유형 이름이 이미 말해주므로, 헤드라인은 패턴·보조 지표를 먼저 쓴다 (docs/06 v0.4.4)
  const byS = (x: Feat, y: Feat) => y.sal - x.sal;
  const feats = [...[...special, ...indFeat].sort(byS), ...axisFeat.sort(byS)];
  const ranked = AXIS_KEYS.map(k => [k, ax[k]] as const).sort((x, y) => Math.abs(y[1].score - NORM[y[0]]) - Math.abs(x[1].score - NORM[x[0]]));
  const leaning = ranked.filter(([, r]) => r.level !== 'bal');
  let headline: string[];
  if (feats.length >= 2) headline = [feats[0].text.and + ',', feats[1].text.adj + ' 사람'];
  else if (feats.length === 1) headline = [feats[0].text.adj + ' 사람'];
  else headline = ['여러 가치 사이에서', '균형을 찾는 사람'];

  const points: [string, string][] = [];
  points.push(['판단할 때', (leaning.length ? leaning : ranked).slice(0, 2).map(([, r]) => r.desc).join(' ')]);
  const [v1, v2] = vices.slice(0, 2).map(([id]) => VICE_PHRASE[id]);
  // '덜 거슬림'은 문장에 넣지 않는다 — 용인으로 읽힘 (docs/05)
  points.push(['관계에서', `${josa(v1, '과', '와')} ${v2}에는 특히 거슬려 해요.`]);
  const [t1, t2] = traits.slice(0, 2).map(([id]) => TRAIT_PHRASE[id]);
  const moral = traits.filter(([id]) => TRAITS[id][1] === '도덕'), charm = traits.filter(([id]) => TRAITS[id][1] === '매력');
  const avg = (xs: Ranked) => xs.reduce((s, [, v]) => s + v, 0) / xs.length;
  const gap = avg(moral) - avg(charm);
  const gapText = gap < -0.1 ? '함께 있을 때의 즐거움과 능력도 크게 봐요.' : gap <= 0.3 ? '됨됨이만큼 함께 있을 때의 즐거움도 중요하게 봐요.' : '';
  points.push(['사람을 볼 때', `${t1}, ${t2}를 가장 먼저 봐요.${gapText ? ' ' + gapText : ''}`]);
  points.push(['나와 남의 기준', fairness(vices, traits, mi).summary]);
  if (folds) points.splice(1, 0, ['부딪힐 때', FOLD_TEXT[fv].point]);

  const good: string[] = [], care: string[] = [];
  const poleGood = leaning.slice(0, 2).map(([, r]) => POLE_TEXT[r.pole].good);
  const poleCare = leaning.slice(0, 2).map(([, r]) => POLE_TEXT[r.pole].care);
  if (folds) care.push(FOLD_TEXT[fv].care);
  indFeat.slice(0, 1).forEach(f => good.push(f.text.good!));
  if (mi.kind === 'strict') care.push('자신에게 엄격한 만큼, 지칠 때 스스로를 몰아붙이기 쉬워요.');
  if (mi.kind === 'lenient') care.push('남에게 거는 기대가 말로 전해지지 않으면, 상대는 기준이 다르다고 느낄 수 있어요.');
  if (ax.BOUND.pole === '자율' && ax.BOUND.level !== 'bal' && ax.EMO.pole === '구분' && ax.EMO.level !== 'bal') care.push('존중과 "결론은 내용으로"가 겹치면, 힘든 사람은 혼자 남겨진 느낌을 받을 수 있어요.');
  // 솔직이 뚜렷하고 직접성도 높으면 '필요한 말'과 '감정적 직설'은 다른 문제라는 안전장치 (docs/06 세트3 81번)
  if (ax.CANDOR.pole === '솔직' && ax.CANDOR.level === 'strong' && ind.direct >= 0.5) care.push('솔직함이 강한 편이에요. 필요한 정보를 전하는 것과 감정을 그대로 쏟는 것은 다른 문제라는 걸 함께 봐 주세요.');
  const balanced = ranked.filter(([, r]) => r.level === 'bal');
  if (balanced.length) good.push(`${balanced.map(([k]) => AXES[k].name.replace(' 축', '')).join('·')} 문제에선 한쪽에 치우치지 않고 상황을 봐요.`);
  return { headline, points, good: [...good, ...poleGood].slice(0, 3), care: [...care, ...poleCare].slice(0, 3) };
}

export function answerShort(id: string, v: number): string {
  const it = ITEMS[id];
  if (it.type === 'sjt') return it.opts[v][0];
  if (v === 2) return '두 생각의 중간';
  const side = v < 2 ? it.L[0] : it.R[0];
  return (v === 0 || v === 4 ? '' : '어느 정도 ') + `"${side}"`;
}

export function isComplete(a: ValuesAnswers): boolean {
  return ORDER.every(id => a.ans[id] !== undefined);
}

export function fullResult(a: ValuesAnswers) {
  const ax = scoreAxes(a), vices = scoreMd(a, 'vice'), traits = scoreMd(a, 'trait'), mi = mirrorIndex(a);
  return { ax, vices, traits, mi, type: typeOf(ax), narrative: buildNarrative(ax, vices, traits, mi), fair: fairness(vices, traits, mi), ind: indicators(vices, traits, mi), trial: trialScore(a) };
}
export type FullResult = ReturnType<typeof fullResult>;
