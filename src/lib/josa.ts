const hasBatchim = (w: string) => {
  const c = w.trim().replace(/["'”’)]+$/, '').slice(-1).charCodeAt(0);
  return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0;
};
/** '(으)로': 받침 없거나 ㄹ 받침이면 '로' */
export const ro = (w: string) => {
  const c = w.trim().slice(-1).charCodeAt(0);
  const jong = c >= 0xac00 && c <= 0xd7a3 ? (c - 0xac00) % 28 : 0;
  return w + (jong === 0 || jong === 8 ? '로' : '으로');
};
/** 받침 유무로 조사 붙이기: josa('사과', '과', '와') → '사과와' */
export const josa = (w: string, withBatchim: string, without: string) => w + (hasBatchim(w) ? withBatchim : without);
