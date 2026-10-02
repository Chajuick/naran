// AI 전달 자료 — docs/07-ai-export-spec.md
// 원칙: 공개 검사(MBTI·애착·기질)는 숫자만, 나란은 AI가 모르는 지표라 설명서 + 점수 + 근거 응답 + 한계를 함께 준다.
// 유형명은 사람이 읽는 라벨일 뿐, 본체는 축 점수. 가치(나란) ≠ 반응 성향(기질·애착)을 AI에게 명시한다.
import { AXES, AXIS_KEYS, ITEMS, ORDER, TRAITS, VICES } from '../../data/values/items';
import type { AttachState, MbtiState, TemperState, ValuesState } from '../../store/useStore';
import { answerShort, isComplete, signedOnAxis, type FullResult } from '../values/scoring';
import { fmtDate, snapLabel, type Snapshot } from '../history';
import { attachDetail, attachText, mbtiDetail, mbtiText, temperDetail, valuesResult } from '../summary';

export type Purpose = 'general' | 'love' | 'conflict' | 'work' | 'stress';
export const PURPOSES: { key: Purpose; label: string; ask: string }[] = [
  { key: 'general', label: '나는 어떤 사람인가', ask: '이 사람이 어떤 사람인지 전반적으로 설명해줘. 강점, 쉽게 오해받는 지점, 스스로도 잘 모를 수 있는 모습을 포함해서.' },
  { key: 'love', label: '연애·가까운 관계', ask: '연애나 가까운 관계에서 이 사람이 어떤 파트너인지, 어떤 사람과 잘 맞고 어떤 지점에서 부딪히기 쉬운지, 상대가 알아두면 좋은 사용설명서를 써줘.' },
  { key: 'conflict', label: '갈등·대화', ask: '갈등 상황에서 이 사람이 무엇을 옳다고 보고 어떻게 반응하기 쉬운지, 서운함을 어떻게 다루는지, 대화가 잘 풀리려면 무엇이 필요한지 알려줘.' },
  { key: 'work', label: '일·협업', ask: '일과 협업에서 이 사람의 강점과 마찰 지점, 잘 맞는 동료·리더 스타일, 피드백을 주고받는 방식에 대해 알려줘.' },
  { key: 'stress', label: '스트레스·회복', ask: '이 사람이 어떤 상황에서 지치기 쉬운지, 스트레스를 받을 때 어떤 모습이 나오는지, 회복에 도움이 되는 것은 무엇인지 알려줘.' },
];

export interface Profile { name?: string; history?: Snapshot[]; values: ValuesState; valuesResult: FullResult | null; mbti: MbtiState; attach: AttachState; temper: TemperState }

const TEMPER_NAME = { NS: '자극 추구', HA: '위험 회피', RD: '사회적 민감성', P: '인내력' } as const;
const MBTI_PAIRS = [['EI', 'E', 'I'], ['SN', 'S', 'N'], ['TF', 'T', 'F'], ['JP', 'J', 'P']] as const;

export function hasMbti(m: MbtiState) { return MBTI_PAIRS.some(([d]) => m.letters[d]); }
export function hasAttach(a: AttachState) { return !!a.style || a.anxiety !== undefined || a.avoidance !== undefined; }
export function hasTemper(t: TemperState) { return Object.values(t.pct).some(x => x !== undefined); }

export function mbtiCode(m: MbtiState) { return MBTI_PAIRS.map(([d]) => m.letters[d] ?? '?').join(''); }

function valuesBlock(v: ValuesState, R: FullResult): string[] {
  const L: string[] = [];
  L.push('━━ 1. 나란 가치관·관계윤리 검사 (자체 개발 지표 — 아래 설명서를 기준으로 해석할 것) ━━');
  L.push('[지표 설명]');
  L.push("이 검사는 관계에서 '무엇이 옳다고 보는지'(가치 판단)를 잰다. 실제 행동이나 성격 반응은 재지 않는다.");
  L.push('양 끝이 모두 덕목인 4개 축 + 보조 지표 3개 + 입장 바꾸기(같은 상황을 남/나로 바꿔 묻기) + 우선순위 카드 2종으로 구성된다.');
  L.push('- 책임 축 (책임 ↔ 이해): 잘못이 있을 때 결과·책임을 먼저 보나, 사정·다시 일어설 여지를 먼저 보나');
  L.push('- 경계 축 (자율 ↔ 보살핌): 가까운 사람의 선택을 그 사람 몫으로 두나, 적극 개입해 챙기는 게 맞다고 보나');
  L.push('- 표현 축 (솔직 ↔ 조화): 상대가 알아야 할 말은 하나(때를 골라 나중에 말해도 솔직), 관계 평온을 위해 끝내 덮어두나');
  L.push('- 감정 축 (구분 ↔ 헤아림): 상대의 감정이 결론에 들어가면 안 된다고 보나, 들어가야 한다고 보나. ※ 헤아림 = 마음을 결정에 넣어야 한다는 가치이지, 남의 마음을 잘 읽는다는 뜻이 아니다');
  L.push('- 보조 지표: 상호성(나와 남에게 같은 기준을 묻나) / 직접성(불만은 말로 꺼내야 한다고 보나) / 수정성(잘못 인정·바로잡기를 중시하나). 우선순위 카드 응답에서 파생, −1~+1');
  L.push('점수: −100(왼쪽 극) ~ +100(오른쪽 극). |20| 미만은 균형. 축당 4문항이라 정밀하지 않다 — 방향과 대략적 강도로만 해석할 것.');
  L.push('유형명 규칙: 대표 유형 = 책임 축 × 경계 축(원칙형=책임+자율, 보호형=책임+보살핌, 포용형=이해+자율, 돌봄형=이해+보살핌, 둘 중 하나라도 균형이면 조율형), 수식어 = 표현 × 감정(단단한=솔직+구분, 따뜻한=솔직+헤아림, 차분한=조화+구분, 포근한=조화+헤아림, 하나라도 균형이면 생략).');
  L.push('');
  L.push('[이 사람의 결과]');
  L.push(`유형: ${R.type.name} (사람이 읽는 라벨. 아래 점수가 본체)`);
  for (const k of AXIS_KEYS) {
    const a = AXES[k], r = R.ax[k], sr = v.selfRating[k];
    const self = sr?.fit ? ` · 본인 평가 ${sr.fit}/5${sr.lean === 'L' ? `, 실제로는 더 ${a.L} 쪽이라고 느낌` : sr.lean === 'R' ? `, 실제로는 더 ${a.R} 쪽이라고 느낌` : sr.lean === 'ok' ? ', 맞다고 느낌' : ''}` : '';
    L.push(`- ${a.name} (${a.L} ↔ ${a.R}): ${Math.round(r.score)} (${r.band}) · 응답 일관성: ${r.conf}${self}`);
  }
  L.push(`- 보조 지표: 상호성 ${R.ind.recip.toFixed(2)} / 직접성 ${R.ind.direct.toFixed(2)} / 수정성 ${R.ind.repair.toFixed(2)}`);
  L.push(`- 입장 바꾸기: ${R.mi.label}${R.mi.note}`);
  L.push(`- 가장 거슬려 하는 것: ${R.vices.slice(0, 3).map(([id]) => VICES[id][0]).join(' / ')}`);
  L.push(`- 비교적 덜 거슬려 하는 것: ${R.vices.slice(-3).reverse().map(([id]) => VICES[id][0]).join(' / ')}`);
  L.push(`- 사람을 볼 때 중시: ${R.traits.filter(([, s]) => s > 0).slice(0, 3).map(([id]) => TRAITS[id][0]).join(' / ')}`);
  L.push(`- 앱이 뽑은 한 줄: ${R.narrative.headline.join(' ')}`);
  L.push('');
  L.push('[판단 근거가 된 응답 예시]');
  for (const k of AXIS_KEYS) {
    const sign = Math.sign(R.ax[k].score);
    const ids = ORDER.filter(id => ITEMS[id].axis === k && v.ans[id] !== undefined)
      .map(id => [id, signedOnAxis(id, v.ans[id])] as const)
      .filter(([, s]) => sign === 0 ? true : Math.sign(s) === sign)
      .sort((x, y) => Math.abs(y[1]) - Math.abs(x[1])).slice(0, 2);
    for (const [id] of ids) {
      const it = ITEMS[id];
      L.push(`- (${AXES[k].name}) ${it.q.startsWith('어느 쪽') ? '두 입장 중' : `"${it.q}"`} → ${answerShort(id, v.ans[id])}`);
    }
  }
  for (const [o, m, t] of [['O4', 'M4', '연인이 반나절 연락이 없었다'], ['V03', 'M1', '걱정돼서 친구의 비밀을 다른 친구에게 말했다'], ['V04', 'M2', '급한 업무 때문에 공동 마감을 놓쳤다']] as const) {
    if (v.ans[o] === undefined || v.ans[m] === undefined || v.ans[o] === v.ans[m]) continue;
    L.push(`- (입장 바꾸기) "${t}" 남이 하면: ${answerShort(o, v.ans[o])} ↔ 내가 하면: ${answerShort(m, v.ans[m])}`);
  }
  L.push('');
  L.push('[측정 한계]');
  L.push("- 가치 판단 검사다. '조화를 옳다고 본다'와 '실제로 갈등을 피한다'는 다를 수 있다 → 기질·애착 결과와 함께 볼 것");
  L.push('- 축당 4문항, 우선순위 카드는 각 2회 노출. AI 대리응답 검증만 거쳤고 실제 사람 데이터로는 검증 중(v0.4.5)');
  L.push('- 대리응답 검증에서 책임 축과 감정 축이 함께 움직이는 경향이 남아 있었다(r≈0.7). 두 축이 같은 방향이면 과잉 해석하지 말 것');
  return L;
}

export function crossSignals(R: FullResult | null, m: MbtiState, a: AttachState, t: TemperState): string[] {
  if (!R) return [];
  const S: string[] = [];
  const ax = R.ax;
  const lean = (k: keyof typeof ax, pole: string) => ax[k].level !== 'bal' && ax[k].pole === pole;
  const anx = a.anxiety ?? (a.style === '불안형' || a.style === '혼란형' ? 70 : a.style ? 30 : undefined);
  const avo = a.avoidance ?? (a.style === '회피형' || a.style === '혼란형' ? 70 : a.style ? 30 : undefined);
  if (lean('EMO', '구분') && m.letters.TF === 'F') S.push('나란 감정 축 "구분"(결론은 내용으로) + MBTI F → 가치와 성향이 다른 지점일 수 있다(머리와 마음의 긴장).');
  if (lean('EMO', '헤아림') && m.letters.TF === 'T') S.push('나란 감정 축 "헤아림" + MBTI T → 판단 방식은 논리적이어도 마음을 결정에 넣어야 한다고 보는 사람일 수 있다.');
  if (R.mi.kind === 'lenient' && anx !== undefined && anx >= 60) S.push('입장 바꾸기에서 남에게 거는 기대가 큼 + 애착 불안 높음 → 기대가 말로 전달되지 않는 패턴의 가능성.');
  if (lean('BOUND', '자율') && avo !== undefined && avo >= 60) S.push('나란 경계 축 "자율" + 애착 회피 높음 → 존중이 거리두기로 전달될 위험.');
  if (lean('BOUND', '보살핌') && anx !== undefined && anx >= 60) S.push('나란 경계 축 "보살핌" + 애착 불안 높음 → 챙김이 확인 욕구와 섞일 수 있다.');
  if (R.ind.direct <= -0.5 && (t.pct.HA ?? 0) >= 60) S.push('직접성 낮음 + 기질 위험 회피 높음 → 불만을 말하지 않는 이유가 가치보다 불안일 가능성.');
  if (lean('RESP', '책임') && (t.pct.P ?? 0) >= 60) S.push('나란 책임 축 "책임" + 기질 인내력 높음 → 자신과 타인 모두에게 높은 기준, 소진 위험.');
  if (lean('CANDOR', '조화') && m.letters.EI === 'E') S.push('나란 표현 축 "조화" + MBTI E → 말이 많아도 불편한 말은 아끼는 사람일 수 있다.');
  return S;
}

export function buildPrompt(p: Profile, purpose: Purpose): string {
  const P = PURPOSES.find(x => x.key === purpose)!;
  const L: string[] = [];
  L.push('너는 심리학 지식이 있는 따뜻하고 정직한 분석가야. 아래는 한 사람이 여러 검사로 모은 "나라는 사람" 자료야.');
  if (p.name) L.push(`이 사람을 "${p.name}"(이)라고 불러줘.`);
  L.push('');
  L.push(`[요청] ${P.ask}`);
  L.push('');
  L.push('[분석 지침]');
  L.push('1. 유형명을 반복하지 말고, 차원 점수와 근거 응답으로 설명할 것');
  L.push('2. 검사 사이의 일치·모순·긴장을 구분해서 짚을 것. 모순은 측정 문제일 수도, 실제 내적 갈등일 수도 있다');
  L.push('3. 가치(나란: 무엇이 옳다고 보나)와 반응 성향(기질·애착: 어떻게 반응하나), 사고방식(MBTI)을 구분해서 해석할 것');
  L.push('4. 근거가 약한 부분은 추측이라고 밝히고, 병리화하거나 진단하지 말 것');
  L.push('5. 장점과 한계를 같이 말하고, 구체적인 상황 예시를 들어줄 것');
  L.push('6. 자료가 없는 검사는 없는 대로 두고 지어내지 말 것');
  L.push('');
  if (p.valuesResult && isComplete(p.values)) L.push(...valuesBlock(p.values, p.valuesResult), '');
  else L.push('━━ 1. 나란 가치관 검사 ━━', '(아직 하지 않음)', '');

  L.push(p.mbti.source === 'oejts'
    ? '━━ 2. 성격 — OEJTS 1.2 한국어 번역판으로 앱에서 검사 (MBTI와 같은 4지표, 공식 MBTI 아님, 국내 표준화 전) ━━'
    : '━━ 2. 성격 — MBTI (본인이 아는 결과를 입력, 공식 검사 여부 불명) ━━');
  if (hasMbti(p.mbti)) {
    L.push(`유형: ${mbtiCode(p.mbti)}`);
    for (const [d, x, y] of MBTI_PAIRS) {
      const l = p.mbti.letters[d], pct = p.mbti.pct[d];
      if (l) L.push(`- ${x}/${y}: ${l}${pct !== undefined ? ` ${pct}%` : ''}`);
    }
  } else L.push('(입력 안 함)');
  L.push('');

  L.push(p.attach.source === 'ecrr'
    ? '━━ 3. 애착 — ECR-R 한국어 번역판으로 앱에서 검사 (불안·회피 2차원, % = 1~7 평균을 0~100으로 옮긴 값, 유형은 척도 중간 초과 여부로만 분류, 국내 규준 없음) ━━'
    : '━━ 3. 애착 (불안·회피 2차원, 본인 입력) ━━');
  if (hasAttach(p.attach)) {
    if (p.attach.style) L.push(`유형: ${p.attach.style}`);
    if (p.attach.anxiety !== undefined) L.push(`- 애착 불안: ${p.attach.anxiety}%`);
    if (p.attach.avoidance !== undefined) L.push(`- 애착 회피: ${p.attach.avoidance}%`);
  } else L.push('(입력 안 함)');
  L.push('');

  L.push(p.temper.source === 'ipip'
    ? '━━ 4. 기질 — IPIP 공개 문항 기반 단축판(차원별 8문항)으로 앱에서 검사 (Cloninger 기질 4차원 개념, TCI 점수 아님, % = 평균을 0~100으로 옮긴 값이며 백분위 아님. 사회적 민감성 일부 문항은 애착 회피와 내용이 겹침) ━━'
    : '━━ 4. 기질 (Cloninger 4차원 개념, 본인 입력) ━━');
  if (hasTemper(p.temper)) {
    for (const [k, name] of Object.entries(TEMPER_NAME)) {
      const x = p.temper.pct[k as keyof typeof TEMPER_NAME];
      if (x !== undefined) L.push(`- ${name}: ${x}%`);
    }
  } else L.push('(입력 안 함)');

  if (p.history && p.history.length >= 2) {
    L.push('', '━━ 변화 기록 (회차별, 다시 하지 않은 검사는 이전 결과를 이어받음) ━━');
    p.history.forEach((s, i) => {
      const vr = valuesResult(s);
      L.push(`[${i + 1}회차 · ${fmtDate(s.at)} · ${snapLabel(s, i)}] 새로 한 검사: ${s.changed.map(m => ({ values: '가치관', mbti: 'MBTI', attach: '애착', temper: '기질' })[m]).join(', ') || '없음'}`);
      if (vr) L.push(`- 가치관: ${vr.type.name} / ${AXIS_KEYS.map(k => `${AXES[k].L}↔${AXES[k].R} ${Math.round(vr.ax[k].score)}`).join(', ')}`);
      if (s.mbti) L.push(`- MBTI: ${mbtiText(s.mbti)}${mbtiDetail(s.mbti) ? ` (${mbtiDetail(s.mbti)})` : ''}`);
      if (s.attach) L.push(`- 애착: ${attachText(s.attach)}${attachDetail(s.attach) ? ` (${attachDetail(s.attach)})` : ''}`);
      if (s.temper) L.push(`- 기질: ${temperDetail(s.temper)}`);
    });
    L.push('→ 회차 사이에 무엇이 바뀌고 무엇이 유지됐는지, 그 변화가 무엇을 뜻할 수 있는지도 함께 해석해줘. 단, 축당 문항이 적어 작은 점수 변화는 측정 오차일 수 있다.');
  }

  const cross = crossSignals(p.valuesResult, p.mbti, p.attach, p.temper);
  if (cross.length) {
    L.push('', '━━ 앱이 먼저 짚은 교차 신호 (확정이 아니라 단서 — 맞는지 판단해줘) ━━');
    cross.forEach(c => L.push(`- ${c}`));
  }
  return L.join('\n');
}
