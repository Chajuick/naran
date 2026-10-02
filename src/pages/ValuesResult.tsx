import { useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import ValuesReport from '../components/ValuesReport';
import { AXES, AXIS_KEYS, AXIS_STYLE, type AxisKey } from '../data/values/items';
import { fullResult, isComplete } from '../lib/values/scoring';
import { pilotText } from '../lib/export/pilot';
import { useStore, type Lean } from '../store/useStore';
import { copyText } from '../lib/clipboard';

export default function ValuesResult() {
  const v = useStore(s => s.values);
  const setValues = useStore(s => s.setValues);
  const resetValues = useStore(s => s.resetValues);
  const nav = useNavigate();
  const [copied, setCopied] = useState(false);
  const [armed, setArmed] = useState(false);
  const R = useMemo(() => fullResult(v), [v]);
  if (!isComplete(v)) return <Navigate to="/values" replace />;
  const { ax } = R;
  const rate = (k: AxisKey, patch: { fit?: number; lean?: Lean }) =>
    setValues(x => ({ ...x, selfRating: { ...x.selfRating, [k]: { ...x.selfRating[k], ...patch } } }));

  return (
    <div className="wrap" style={{ paddingBottom: 60 }}>
      <div className="top"><Link className="back" to="/tests" aria-label="검사로">‹</Link><span className="count" style={{ marginLeft: 'auto' }}>나란 가치관 검사</span></div>
      <ValuesReport answers={v} />

      <div className="sec">이 결과, 나랑 맞나요?</div>
      <p className="sec-sub">축마다 골라주세요. 검사를 다듬는 데 쓰여요.</p>
      {AXIS_KEYS.map(k => {
        const r = v.selfRating[k] ?? {}, a = AXES[k], st = AXIS_STYLE[k];
        return (
          <div key={k} className="rate" style={{ '--c': st.c, '--tint': st.tint } as React.CSSProperties}>
            <div className="rate-h"><b>{a.name}</b> · {ax[k].band}</div>
            <div className="rate-q">나를 얼마나 잘 설명하나요?</div>
            <div className="seg">{[1, 2, 3, 4, 5].map(n => <button key={n} className={r.fit === n ? 'sel' : ''} onClick={() => rate(k, { fit: n })}>{n}</button>)}</div>
            <div className="seg-hint"><span>전혀 아니에요</span><span>매우 그래요</span></div>
            <div className="rate-q">실제 나는</div>
            <div className="seg three">
              <button className={r.lean === 'L' ? 'sel' : ''} onClick={() => rate(k, { lean: 'L' })}>더 {a.L} 쪽</button>
              <button className={r.lean === 'ok' ? 'sel' : ''} onClick={() => rate(k, { lean: 'ok' })}>딱 맞아요</button>
              <button className={r.lean === 'R' ? 'sel' : ''} onClick={() => rate(k, { lean: 'R' })}>더 {a.R} 쪽</button>
            </div>
          </div>
        );
      })}

      <button className="ghost primary" style={{ marginTop: 24 }} onClick={() => nav('/analyze')}>분석 자료 만들기</button>
      <button className="ghost" onClick={async () => { await copyText(pilotText(v, R)); setCopied(true); }}>
        {copied ? '복사했어요 · 보내실 곳에 붙여넣어 주세요' : '검사 응답 복사 (파일럿용)'}
      </button>
      <p className="note" style={{ marginTop: 8 }}>파일럿용 복사에는 내가 고른 답과 자기평가가 들어가요. 직접 붙여넣어 보낼 때만 기기 밖으로 나가요.</p>
      <button className="ghost" onClick={() => {
        // 브라우저 확인창 대신 두 번 누르기 — 결과를 실수로 지우지 않게
        if (armed) { useStore.getState().recordHistory(); resetValues(); nav('/values'); } else { setArmed(true); setTimeout(() => setArmed(false), 3000); }
      }}>{armed ? '한 번 더 누르면 새로 시작해요' : '다시 검사하기'}</button>
      <p className="note" style={{ marginTop: 8 }}>다시 검사해도 이번 결과는 '나라는 사람' 기록에 남아요.</p>
      <p className="note" style={{ marginTop: 24 }}>※ 시험 단계 검사예요. 실제 사람 데이터로 검증하는 중이라 기준과 문장은 바뀔 수 있어요.</p>
    </div>
  );
}
