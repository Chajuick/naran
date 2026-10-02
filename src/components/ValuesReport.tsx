// 가치관 결과 본문 — 현재 결과(결과 화면)와 지난 회차(기록 상세)가 함께 쓴다
import { useMemo } from 'react';
import { AXES, AXIS_KEYS, AXIS_STYLE, ITEMS, ORDER, TRAITS, VICES, type AxisKey } from '../data/values/items';
import { answerShort, fullResult, signedOnAxis, type ValuesAnswers } from '../lib/values/scoring';

const isGeneric = (q: string) => q.startsWith('어느 쪽');

export default function ValuesReport({ answers }: { answers: ValuesAnswers }) {
  const v = answers;
  const R = useMemo(() => fullResult(v), [v]);
  const { ax, vices, traits, mi, type: T, narrative: N, fair: FA } = R;

  const axisCard = (k: AxisKey) => {
    const a = AXES[k], r = ax[k], st = AXIS_STYLE[k], pos = 50 + r.score / 2;
    const ids = ORDER.filter(id => ITEMS[id].axis === k && v.ans[id] !== undefined);
    return (
      <div key={k} className="ax" style={{ '--c': st.c, '--tint': st.tint } as React.CSSProperties}>
        <div className="ax-top">
          <div className="ax-name">{a.name} · {a.L} ↔ {a.R}</div>
          <div className="ax-band">{r.band}<span className="ax-conf">{r.conf}</span></div>
          <p className="ax-desc">{r.desc}</p>
          <div className="track"><span className="fill" style={{ left: `${Math.min(50, pos)}%`, width: `${Math.abs(pos - 50)}%` }} /><span className="c" /><span className="m" style={{ left: `${pos}%` }} /></div>
          <div className="poles-row"><span>{a.L}</span><span>{a.R}</span></div>
        </div>
        <details className="ev"><summary>이렇게 답했어요 ({ids.length}문항)</summary>
          {ids.map(id => {
            const s = signedOnAxis(id, v.ans[id]), it = ITEMS[id];
            return (
              <div key={id} className="ev-item"><div className="q">{isGeneric(it.q) ? '두 생각 중에서' : it.q}</div>
                <div className="a">{answerShort(id, v.ans[id])}
                  <span className={`chip ${s === 0 ? 'zero' : ''}`}>{s === 0 ? '중간' : `${s < 0 ? a.L : a.R} ${Math.abs(s)}`}</span></div></div>
            );
          })}
        </details>
      </div>
    );
  };

  const mirrorRows = ([['O4', 'M4', '바빠서 반나절 연락이 없던 일'], ['V03', 'M1', '비밀을 옮긴 일'], ['V04', 'M2', '급한 일로 마감을 놓친 일'], ['O3', 'M3', '"솔직히 별로야"라고 한 일']] as const)
    .filter(([o, m]) => v.ans[o] !== undefined && v.ans[m] !== undefined);

  return (
    <>

      <div className="type-card">
        <div className="eyebrow">당신은</div>
        <div className="type-name">{T.name}</div>
        <div className="type-tag">{T.tagline}</div>
        <p className="type-desc">{T.desc}{T.modDesc ? ' ' + T.modDesc : ''}</p>
        <div className="type-axes">
          {AXIS_KEYS.map(k => (
            <span key={k} className="type-chip" style={{ '--c': AXIS_STYLE[k].c, '--tint': AXIS_STYLE[k].tint } as React.CSSProperties}>
              {ax[k].level === 'bal' ? `${AXES[k].L}·${AXES[k].R} 균형` : `${ax[k].level === 'strong' ? '뚜렷하게' : '약간'} ${ax[k].pole}`}
            </span>
          ))}
        </div>
      </div>

      <div className="hero" style={{ paddingTop: 20 }}>
        <div className="eyebrow">그중에서도 나는</div>
        <h1>{N.headline.map((l, i) => <span key={i}>{l}{i < N.headline.length - 1 && <br />}</span>)}</h1>
        <p className="note" style={{ margin: '10px 0 0' }}>이 결과는 내가 <b>무엇이 옳다고 보는지</b>예요. 실제로 어떻게 행동하는지와는 다를 수 있어요.</p>
      </div>

      <div className="points">{N.points.map(([k, t]) => <div key={k} className="point"><div className="k">{k}</div><div className="v">{t}</div></div>)}</div>
      <div className="duo">
        <div className="card good"><h3>이럴 때 빛나요</h3><ul>{N.good.map(t => <li key={t}>{t}</li>)}</ul></div>
        <div className="card care"><h3>이런 건 조심해요</h3><ul>{N.care.map(t => <li key={t}>{t}</li>)}</ul></div>
      </div>

      <div className="sec">이렇게 나온 이유</div>
      <p className="sec-sub">각 축을 눌러 내가 한 답을 확인할 수 있어요.</p>
      {AXIS_KEYS.map(axisCard)}

      <div className="card"><h3>가장 거슬리는 것</h3>
        <ol className="rank neg">{vices.slice(0, 3).map(([id]) => <li key={id}>{VICES[id][0]}</li>)}</ol>
        <div className="sub-h">비교적 덜 거슬리는 것</div>
        <ol className="rank mute">{vices.slice(-3).reverse().map(([id]) => <li key={id}>{VICES[id][0]}</li>)}</ol></div>
      <div className="card"><h3>사람을 볼 때 중요한 것</h3>
        <ol className="rank pos">{traits.filter(([, s]) => s > 0).slice(0, 3).map(([id]) => <li key={id}>{TRAITS[id][0]}</li>)}</ol>
        <div className="sub-h">덜 중요하게 보는 것</div>
        <ol className="rank mute">{traits.slice(-3).reverse().map(([id]) => <li key={id}>{TRAITS[id][0]}</li>)}</ol></div>
      <div className="card"><h3>공정 · 같은 기준</h3>
        <div className="mirror-row wide"><b>이중잣대가 거슬리는 정도</b><span>{FA.vLabel}</span></div>
        <div className="mirror-row wide"><b>"같은 기준"인 사람을</b><span>{FA.tLabel}</span></div>
        <div className="mirror-row wide"><b>실제로 쓰는 기준</b><span>{mi.label}{mi.note}</span></div>
        <details className="ev" style={{ padding: '4px 0 0' }}><summary>입장 바꿔 답한 것 보기</summary>
          {mirrorRows.map(([o, m, t]) => (
            <div key={m} className="ev-item"><div className="q">{t}</div>
              <div className="mirror-row"><b>남이 하면</b><span>{answerShort(o, v.ans[o])}</span></div>
              <div className="mirror-row"><b>내가 하면</b><span>{answerShort(m, v.ans[m])}</span></div></div>
          ))}
        </details></div>

    </>
  );
}
