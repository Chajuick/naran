// 회차별 '나' 기록 — 검사를 할 때마다 그 시점의 나를 한 장(스냅숏)으로 남긴다.
// - 바뀌지 않은 검사는 이전 회차 결과를 그대로 이어받는다 (스냅숏마다 네 검사 전부를 담음)
// - 일주일 안에 한 검사들은 한 회차로 묶는다 (며칠에 걸친 '종합 검사'를 한 장으로)
// - 모든 기록은 이 기기에만 저장 (CLAUDE.md)
import type { AttachState, MbtiState, TemperState, ValuesState } from '../store/useStore';
import type { MdPick, TieRec } from './values/scoring';

export type ModuleKey = 'values' | 'mbti' | 'attach' | 'temper';
export const MODULE_KEYS: ModuleKey[] = ['values', 'mbti', 'attach', 'temper'];
export const MODULE_NAME: Record<ModuleKey, string> = { values: '가치관', mbti: 'MBTI', attach: '애착', temper: '기질' };

export interface ValuesSnap { ans: Record<string, number>; md: Record<string, MdPick | TieRec | undefined>; finishedAt?: number }
export interface Snapshot {
  id: string;
  /** 회차가 시작된 시각 */
  at: number;
  updatedAt: number;
  /** 이 회차에 새로 하거나 바뀐 검사 */
  changed: ModuleKey[];
  label?: string;
  values?: ValuesSnap;
  mbti?: MbtiState;
  attach?: AttachState;
  temper?: TemperState;
}

export const SESSION_WINDOW = 7 * 24 * 60 * 60 * 1000;

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

/** 모듈별 '같은 결과인지' 비교용 키 (시각·자기평가 등은 무시) */
export function moduleKey(m: ModuleKey, s: Pick<Snapshot, ModuleKey>): string {
  if (m === 'values') return s.values ? JSON.stringify([s.values.ans, s.values.md]) : '';
  if (m === 'mbti') return s.mbti ? JSON.stringify([s.mbti.letters, s.mbti.pct]) : '';
  if (m === 'attach') return s.attach ? JSON.stringify([s.attach.style, s.attach.anxiety, s.attach.avoidance]) : '';
  return s.temper ? JSON.stringify(s.temper.pct) : '';
}

export interface Current { values: ValuesState; valuesComplete: boolean; mbti: MbtiState; attach: AttachState; temper: TemperState }

export function currentModules(c: Current): Pick<Snapshot, ModuleKey> {
  const hasM = Object.values(c.mbti.letters).some(Boolean);
  const hasA = !!c.attach.style || c.attach.anxiety !== undefined || c.attach.avoidance !== undefined;
  const hasT = Object.values(c.temper.pct).some(x => x !== undefined);
  return {
    values: c.valuesComplete ? { ans: clone(c.values.ans), md: clone(c.values.md), finishedAt: c.values.finishedAt } : undefined,
    mbti: hasM ? clone(c.mbti) : undefined,
    attach: hasA ? clone(c.attach) : undefined,
    temper: hasT ? clone(c.temper) : undefined,
  };
}

/**
 * 지금 상태를 기록에 반영한다. 바뀐 검사가 없으면 그대로 돌려준다.
 * 마지막 회차가 일주일 안이면 그 회차를 갱신, 아니면 새 회차를 연다.
 * 바뀌지 않은 검사는 지금 상태(= 이전 결과)를 그대로 담는다.
 */
export function record(history: Snapshot[], c: Current, now = Date.now()): Snapshot[] {
  const mods = currentModules(c);
  const last = history[history.length - 1];
  // 진행 중이거나 지운 검사는 직전 회차 결과를 이어받는다 (다시 검사하는 중에도 '나'는 유지)
  for (const m of MODULE_KEYS) if (!mods[m] && last?.[m]) (mods as Record<ModuleKey, unknown>)[m] = last[m];
  const base = history.length >= 2 && last && now - last.at < SESSION_WINDOW ? history[history.length - 2] : last;
  const sameAsLast = last && MODULE_KEYS.every(m => moduleKey(m, mods) === moduleKey(m, last));
  if (sameAsLast) return history;
  if (!last && MODULE_KEYS.every(m => !mods[m])) return history;

  if (last && now - last.at < SESSION_WINDOW) {
    // 같은 회차: 이전 회차(base) 대비 달라진 검사를 changed 로
    const changed = MODULE_KEYS.filter(m => mods[m] && (history.length < 2 || moduleKey(m, mods) !== moduleKey(m, base)));
    const merged: Snapshot = { ...last, ...mods, updatedAt: now, changed };
    return [...history.slice(0, -1), merged];
  }
  const changed = MODULE_KEYS.filter(m => mods[m] && (!last || moduleKey(m, mods) !== moduleKey(m, last)));
  return [...history, { id: `s${now}`, at: now, updatedAt: now, changed, ...mods }];
}

export function snapLabel(s: Snapshot, i: number): string {
  if (s.label) return s.label;
  const allNew = s.changed.length === 4 || (i === 0 && s.changed.length >= 2);
  if (allNew) return '종합';
  if (s.changed.length === 1) return `${MODULE_NAME[s.changed[0]]} 다시`;
  return s.changed.map(m => MODULE_NAME[m]).join('·') + ' 다시';
}

export const fmtDate = (t: number) => { const d = new Date(t); return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`; };
export const fmtMonth = (t: number) => { const d = new Date(t); return `${d.getFullYear() % 100}년 ${d.getMonth() + 1}월`; };
