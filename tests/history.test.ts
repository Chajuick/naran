import { describe, expect, it } from 'vitest';
import { record, snapLabel, type Current } from '../src/lib/history';

const DAY = 24 * 60 * 60 * 1000;
const T0 = Date.UTC(2026, 3, 10); // 4월 10일
const empty = (): Current => ({
  values: { step: 0, ans: {}, md: {}, perm: {}, flags: {}, selfRating: {} }, valuesComplete: false,
  mbti: { letters: {}, pct: {} }, attach: {}, temper: { pct: {} },
});
const withValues = (c: Current, v: number): Current => ({ ...c, valuesComplete: true, values: { ...c.values, ans: { V01: v } } });

describe('회차 기록', () => {
  it('아무것도 없으면 기록하지 않는다', () => {
    expect(record([], empty(), T0)).toEqual([]);
  });

  it('일주일 안에 한 검사는 한 회차(종합)로 묶인다', () => {
    let c = withValues(empty(), 1);
    let h = record([], c, T0);
    c = { ...c, mbti: { letters: { EI: 'I', SN: 'N', TF: 'F', JP: 'P' }, pct: {} } };
    h = record(h, c, T0 + 2 * DAY);
    c = { ...c, attach: { style: '안정형' } };
    h = record(h, c, T0 + 3 * DAY);
    c = { ...c, temper: { pct: { HA: 60 } } };
    h = record(h, c, T0 + 4 * DAY);
    expect(h).toHaveLength(1);
    expect(h[0].changed.sort()).toEqual(['attach', 'mbti', 'temper', 'values']);
    expect(snapLabel(h[0], 0)).toBe('종합');
  });

  it('6월에 가치관만 다시 하면 새 회차, 나머지는 그대로 이어받는다', () => {
    let c = withValues({ ...empty(), mbti: { letters: { EI: 'E' }, pct: {} } }, 1);
    let h = record([], c, T0);
    c = withValues(c, 2);
    h = record(h, c, T0 + 60 * DAY);
    expect(h).toHaveLength(2);
    expect(h[1].changed).toEqual(['values']);
    expect(h[1].mbti?.letters.EI).toBe('E');
    expect(h[1].values?.ans.V01).toBe(2);
    expect(h[0].values?.ans.V01).toBe(1);
    expect(snapLabel(h[1], 1)).toBe('가치관 다시');
  });

  it('가치관을 다시 하는 중(미완료)에 MBTI를 바꿔도 가치관은 이전 결과를 유지한다', () => {
    let c = withValues(empty(), 1);
    let h = record([], c, T0);
    c = { ...empty(), mbti: { letters: { EI: 'I' }, pct: {} } };
    h = record(h, c, T0 + 30 * DAY);
    expect(h).toHaveLength(2);
    expect(h[1].changed).toEqual(['mbti']);
    expect(h[1].values?.ans.V01).toBe(1);
  });

  it('같은 결과를 다시 저장하면 회차를 만들지 않는다', () => {
    const c = withValues(empty(), 1);
    const h = record([], c, T0);
    expect(record(h, c, T0 + 60 * DAY)).toBe(h);
  });

  it('새 회차 안에서 다시 바꾸면 그 회차만 갱신된다 (이전 회차 대비 changed)', () => {
    let c = withValues({ ...empty(), mbti: { letters: { EI: 'E' }, pct: {} } }, 1);
    let h = record([], c, T0);
    c = withValues(c, 2);
    h = record(h, c, T0 + 60 * DAY);
    c = { ...c, mbti: { letters: { EI: 'I' }, pct: {} } };
    h = record(h, c, T0 + 61 * DAY);
    expect(h).toHaveLength(2);
    expect(h[1].changed.sort()).toEqual(['mbti', 'values']);
  });
});
