// 모든 응답은 이 기기(localStorage)에만 저장한다. 서버로 보내지 않는다 (CLAUDE.md 원칙)
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AxisKey } from '../data/values/items';
import { isComplete, type MdPick, type TieRec } from '../lib/values/scoring';
import { record, type Snapshot } from '../lib/history';

export type Lean = 'ok' | 'L' | 'R';
export interface SelfRating { fit?: number; lean?: Lean }

export interface ValuesState {
  step: number;
  ans: Record<string, number>;
  md: Record<string, MdPick | TieRec | undefined>;
  /** 선택지 표시 순서 (사람마다 섞되 한 번 정해지면 고정) */
  perm: Record<string, number[]>;
  flags: Record<string, string>;
  startedAt?: number;
  finishedAt?: number;
  selfRating: Partial<Record<AxisKey, SelfRating>>;
}

export type MbtiDim = 'EI' | 'SN' | 'TF' | 'JP';
/** source: 'self' = 알고 있는 결과 입력, 그 외 = 앱 안 검사 (docs/instruments) */
export interface MbtiState { letters: Partial<Record<MbtiDim, string>>; pct: Partial<Record<MbtiDim, number>>; updatedAt?: number; source?: 'self' | 'oejts'; raw?: Record<string, number> }

export type AttachStyle = '안정형' | '불안형' | '회피형' | '혼란형';
export interface AttachState { style?: AttachStyle; anxiety?: number; avoidance?: number; updatedAt?: number; source?: 'self' | 'ecrr'; raw?: { anx: number; avo: number } }

export type TemperDim = 'NS' | 'HA' | 'RD' | 'P';
export interface TemperState { pct: Partial<Record<TemperDim, number>>; updatedAt?: number; source?: 'self' | 'ipip' }

export type TestKind = 'oejts' | 'ecrr' | 'temper';
/** 앱 안 공개 검사 진행 상태. order = 사람마다 섞인 문항 순서(고정) */
export interface TestRun { ans: Record<string, number>; order: string[]; step: number; finishedAt?: number }

export interface ProfileState { name?: string; onboarded?: boolean; /** 네 조각을 다 채운 축하를 봤는지 */ celebrated?: boolean }

const emptyValues = (): ValuesState => ({ step: 0, ans: {}, md: {}, perm: {}, flags: {}, selfRating: {} });

interface Store {
  profile: ProfileState;
  values: ValuesState;
  mbti: MbtiState;
  attach: AttachState;
  temper: TemperState;
  history: Snapshot[];
  tests: Partial<Record<TestKind, TestRun>>;
  setTest: (k: TestKind, run: TestRun | undefined) => void;
  /** 지금 상태를 회차 기록에 반영 (검사 완료·입력 저장 때 호출) */
  recordHistory: () => void;
  setSnapshotLabel: (id: string, label: string) => void;
  setProfile: (p: ProfileState) => void;
  setValues: (fn: (v: ValuesState) => ValuesState) => void;
  resetValues: () => void;
  setMbti: (m: MbtiState) => void;
  setAttach: (a: AttachState) => void;
  setTemper: (t: TemperState) => void;
}

export const useStore = create<Store>()(persist((set, get) => ({
  profile: {},
  values: emptyValues(),
  mbti: { letters: {}, pct: {} },
  attach: {},
  temper: { pct: {} },
  history: [],
  tests: {},
  setTest: (k, run) => set(s => ({ tests: { ...s.tests, [k]: run } })),
  recordHistory: () => {
    const { values, mbti, attach, temper, history } = get();
    const next = record(history, { values, valuesComplete: isComplete(values), mbti, attach, temper });
    if (next !== history) set({ history: next });
  },
  setSnapshotLabel: (id, label) => set(s => ({ history: s.history.map(h => (h.id === id ? { ...h, label: label || undefined } : h)) })),
  setProfile: profile => set({ profile }),
  setValues: fn => set(s => ({ values: fn(s.values) })),
  resetValues: () => set({ values: emptyValues() }),
  setMbti: mbti => { set({ mbti: { ...mbti, updatedAt: Date.now() } }); get().recordHistory(); },
  setAttach: attach => { set({ attach: { ...attach, updatedAt: Date.now() } }); get().recordHistory(); },
  setTemper: temper => { set({ temper: { ...temper, updatedAt: Date.now() } }); get().recordHistory(); },
}), { name: 'naran-v1', version: 1 }));
