// 파일럿용 응답 복사 — 사용자가 직접 눌러 복사할 때만 기기 밖으로 나간다
import { AXES, AXIS_KEYS, ITEMS, TRIAL } from '../../data/values/items';
import type { ValuesState } from '../../store/useStore';
import type { FullResult, MdPick, TieRec } from '../values/scoring';

export function pilotText(v: ValuesState, R: FullResult): string {
  const mins = v.startedAt && v.finishedAt ? Math.round((v.finishedAt - v.startedAt) / 60000) : null;
  const L = [`[나란 가치검사 v0.4.5 파일럿 응답]${mins !== null ? ` 소요 약 ${mins}분` : ''}`, ''];
  L.push(`■ 유형: ${R.type.name} (${R.type.code})`);
  L.push(`■ 헤드라인: ${R.narrative.headline.join(' ')}`);
  L.push('', '■ 4축 (점수 −100~+100)');
  for (const k of AXIS_KEYS) {
    const a = AXES[k], r = R.ax[k], sr = v.selfRating[k];
    const lean = sr?.lean === 'L' ? `더 ${a.L} 쪽` : sr?.lean === 'R' ? `더 ${a.R} 쪽` : sr?.lean === 'ok' ? '맞음' : '-';
    L.push(`- ${a.name}(${a.L}↔${a.R}): ${r.band} / 점수 ${Math.round(r.score)} / 자기평가 ${sr?.fit ?? '-'}점, 실제 나는 ${lean}`);
  }
  L.push('', `■ 기준 일관성: ${R.mi.kind} (쌍별 ${R.mi.ds.join('/')})`);
  L.push(`■ 보조 지표: 상호성 ${R.ind.recip.toFixed(2)} / 직접성 ${R.ind.direct.toFixed(2)} / 수정성 ${R.ind.repair.toFixed(2)}`);
  L.push(`■ 시험 축 수평↔연륜: ${R.trial.label} (${R.trial.raw}) · ${TRIAL.map(id => `${id}=${fmt(id, v.ans[id])}`).join(' ')}`);
  const flags = Object.entries(v.flags);
  L.push('', `■ 애매 표시 ${flags.length}개`);
  flags.forEach(([k, t]) => L.push(`- ${k}: ${t.trim() || '(메모 없음)'}`));
  L.push('', '■ 전체 응답');
  L.push(Object.entries(v.ans).map(([k, x]) => `${k}=${fmt(k, x)}`).join(' '));
  L.push(Object.entries(v.md).filter(([, m]) => m).map(([k, m]) => k.endsWith('Tie') ? `${k}: ${(m as TieRec).picks.join('>')}` : `${k}: 최악 ${(m as MdPick).w} / 최선 ${(m as MdPick).b}`).join(' | '));
  return L.join('\n');
}

function fmt(id: string, x: number | undefined) {
  if (x === undefined) return '-';
  return ITEMS[id].type === 'sjt' ? 'ABCD'[x] : String(x);
}
