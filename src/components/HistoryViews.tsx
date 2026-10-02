// 기록 보드 · 4축 변화 그래프 · 회차 이름 고치기 — 기록 탭과 회차 상세가 함께 쓴다
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { PIECE_COLORS } from './Pieces';
import { AXES, AXIS_KEYS, AXIS_STYLE } from '../data/values/items';
import { fmtDate, MODULE_KEYS, MODULE_NAME, snapLabel, type Snapshot } from '../lib/history';
import { axisSeries, moduleTitle, valuesResult } from '../lib/summary';

export function LabelEdit({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [edit, setEdit] = useState(false);
  const [v, setV] = useState(value);
  if (!edit) return <button className="board-label" onClick={e => { e.preventDefault(); setV(value); setEdit(true); }} title="이름 붙이기">{value} ✎</button>;
  return (
    <input className="board-label-input" autoFocus value={v} maxLength={14} onClick={e => e.preventDefault()} onChange={e => setV(e.target.value)}
      onBlur={() => { onSave(v.trim()); setEdit(false); }} onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />
  );
}

export function MiniAxes({ s }: { s: Snapshot }) {
  const r = valuesResult(s);
  if (!r) return null;
  return (
    <div className="mini-axes">
      {AXIS_KEYS.map(k => (
        <div key={k} className="mini-axis" title={`${AXES[k].name} ${r.ax[k].band}`}>
          <span className="mini-c" />
          <span className="mini-dot" style={{ left: `${50 + r.ax[k].score / 2}%`, background: AXIS_STYLE[k].c }} />
        </div>
      ))}
    </div>
  );
}

export function HistoryBoard({ history, onLabel }: { history: Snapshot[]; onLabel: (id: string, v: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.scrollTo({ left: 99999 }); }, [history.length]);
  return (
    <div className="board" ref={ref}>
      <div className="board-col labels">
        <div className="board-head" />
        {MODULE_KEYS.map((m, i) => <div key={m} className="board-cell label" style={{ color: PIECE_COLORS[i] }}>{MODULE_NAME[m]}</div>)}
      </div>
      {history.map((s, i) => (
        <Link to={`/history/${s.id}`} key={s.id} className={`board-col ${i === history.length - 1 ? 'latest' : ''}`}>
          <div className="board-head">
            <div className="board-n">{i + 1}회차{i === history.length - 1 ? ' · 지금' : ''}</div>
            <div className="board-date">{fmtDate(s.at)}</div>
            <LabelEdit value={snapLabel(s, i)} onSave={v => onLabel(s.id, v)} />
          </div>
          {MODULE_KEYS.map((m, mi) => {
            const isNew = s.changed.includes(m);
            return (
              <div key={m} className={`board-cell ${isNew ? 'new' : s[m] ? 'kept' : 'none'}`} style={{ '--c': PIECE_COLORS[mi] } as React.CSSProperties}>
                {s[m] ? (<>
                  <b>{moduleTitle(m, s)}</b>
                  {m === 'values' && <MiniAxes s={s} />}
                  <span className="board-tag">{isNew ? (i === 0 ? '처음' : '새로') : '유지'}</span>
                </>) : <span className="board-tag">비어 있음</span>}
              </div>
            );
          })}
        </Link>
      ))}
    </div>
  );
}

export function AxisChart({ history }: { history: Snapshot[] }) {
  const series = axisSeries(history);
  if (series.length < 2) return <div className="card"><p className="note" style={{ margin: 0 }}>가치관 검사를 한 번 더 하면, 네 축이 어떻게 움직였는지 그래프로 보여드려요.</p></div>;
  const W = 340, H = 200, pl = 46, pr = 46, pt = 14, pb = 26;
  const x = (i: number) => pl + (i * (W - pl - pr)) / (series.length - 1);
  const y = (v: number) => pt + ((100 - v) / 200) * (H - pt - pb);
  return (
    <div className="card chart-card">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="가치관 네 축의 회차별 변화">
        <line x1={pl} x2={W - pr} y1={y(0)} y2={y(0)} stroke="#d1d6db" strokeDasharray="3 4" />
        <text x={4} y={y(100) + 4} fontSize="10" fill="#b0b8c1">+100</text>
        <text x={4} y={y(-100) + 4} fontSize="10" fill="#b0b8c1">−100</text>
        {AXIS_KEYS.map(k => (
          <g key={k}>
            <polyline points={series.map((p, i) => `${x(i)},${y(p.scores[k])}`).join(' ')} fill="none" stroke={AXIS_STYLE[k].c} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" className="chart-line" />
            {series.map((p, i) => <circle key={i} cx={x(i)} cy={y(p.scores[k])} r="3.5" fill={AXIS_STYLE[k].c} />)}
          </g>
        ))}
        {series.map((p, i) => <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" fill="#8b95a1">{p.idx + 1}회차 · {fmtDate(history[p.idx].at).slice(2)}</text>)}
      </svg>
      <div className="chart-legend">{AXIS_KEYS.map(k => <span key={k} style={{ color: AXIS_STYLE[k].c }}>● {AXES[k].L}↔{AXES[k].R}</span>)}</div>
      <p className="note" style={{ margin: '6px 0 0' }}>가운데 점선이 균형이에요. 위는 {AXIS_KEYS.map(k => AXES[k].R).join('·')} 쪽, 아래는 {AXIS_KEYS.map(k => AXES[k].L).join('·')} 쪽이에요.</p>
    </div>
  );
}
