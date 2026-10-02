import { MIRROR_ORDER, SEQ, TRAIT_SETS, VICE_SETS, type Pool } from '../../data/values/items';

export type Step =
  | { kind: 'intro' }
  | { kind: 'item'; id: string; part: string }
  | { kind: 'break'; title: string; text: string }
  | { kind: 'md'; set: string[]; pool: Pool; idx: number }
  | { kind: 'tie'; pool: Pool }
  | { kind: 'result' };

export const STEPS: Step[] = [{ kind: 'intro' }];
SEQ.forEach(id => STEPS.push({ kind: 'item', id, part: '1부 · 상황 판단' }));
STEPS.push({ kind: 'break', title: '절반 왔어요', text: '이번엔 고르기만 하면 돼요.\n카드 5장 중에 가장 거슬리는 것 하나, 가장 덜 거슬리는 것 하나를 골라주세요.' });
VICE_SETS.forEach((set, idx) => STEPS.push({ kind: 'md', set, pool: 'vice', idx }));
STEPS.push({ kind: 'tie', pool: 'vice' });
STEPS.push({ kind: 'break', title: '거의 다 왔어요', text: '이번엔 가까이 두고 싶은 사람, 그리고 내가 한 일이라면 어떨지를 번갈아 물어볼게요.' });
MIRROR_ORDER.forEach((id, i) => {
  STEPS.push({ kind: 'md', set: TRAIT_SETS[i], pool: 'trait', idx: i });
  STEPS.push({ kind: 'item', id, part: '3부 · 내가 했다면' });
});
STEPS.push({ kind: 'tie', pool: 'trait' });
STEPS.push({ kind: 'result' });

const counted = (s: Step) => s.kind === 'item' || s.kind === 'md';
export const TOTAL_Q = STEPS.filter(counted).length;
export const qNumber = (i: number) => STEPS.slice(0, i + 1).filter(counted).length;
export const RESULT_STEP = STEPS.length - 1;
