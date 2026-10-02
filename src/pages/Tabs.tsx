// 검사 탭 · 기록 탭 · 회차 상세 · 분석 탭
import { useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { PIECE_COLORS } from '../components/Pieces';
import { TabPage } from '../components/TabBar';
import ValuesReport from '../components/ValuesReport';
import { AxisChart, HistoryBoard, LabelEdit } from '../components/HistoryViews';
import { fmtDate, MODULE_KEYS, MODULE_NAME, snapLabel, type ModuleKey } from '../lib/history';
import { buildPrompt, hasAttach, hasMbti, hasTemper, mbtiCode, PURPOSES, type Purpose } from '../lib/export/prompt';
import { diffLines, moduleTitle, temperText } from '../lib/summary';
import { fullResult, isComplete } from '../lib/values/scoring';
import { RESULT_STEP } from '../lib/values/steps';
import { copyText } from '../lib/clipboard';
import { useStore } from '../store/useStore';
import { moduleDetail } from './Me';

/** 각 검사가 마지막으로 바뀐 날 */
function lastChanged(history: ReturnType<typeof useStore.getState>['history'], m: ModuleKey) {
  for (let i = history.length - 1; i >= 0; i--) if (history[i].changed.includes(m)) return history[i].updatedAt;
  return undefined;
}

export function TestsTab() {
  const { profile, history, values, mbti, attach, temper } = useStore();
  const done = isComplete(values);
  const R = useMemo(() => (done ? fullResult(values) : null), [values, done]);
  if (!profile.onboarded) return <Navigate to="/welcome" replace />;
  const started = values.step > 0 && !done;
  const when = (m: ModuleKey) => { const t = lastChanged(history, m); return t ? ` · ${fmtDate(t)}` : ''; };
  const cards: { m: ModuleKey; to: string; tag: string; title: string; sub: string; go: string; main?: boolean }[] = [
    { m: 'values', main: true, to: done ? '/values/result' : '/values', tag: '가치관 · 나란 검사',
      title: R ? R.type.name : '관계에서 가장 소중한 가치는 무엇인가요?',
      sub: R ? `${R.type.tagline}${when('values')}` : started ? `이어서 하기 · ${Math.round(values.step / RESULT_STEP * 100)}%` : '관계 속 판단 기준 · 약 7분',
      go: done ? '결과 보기' : started ? '이어하기' : '시작하기' },
    { m: 'mbti', to: '/mbti', tag: '성격 · MBTI', title: hasMbti(mbti) ? mbtiCode(mbti) : '어떻게 생각하고 정보를 다루나요?', sub: hasMbti(mbti) ? `${mbti.source === 'oejts' ? '검사 결과' : '입력한 결과'}${when('mbti')}` : '검사 32문항 · 약 5분 · 결과 입력도 돼요', go: hasMbti(mbti) ? '다시 하기' : '시작하기' },
    { m: 'attach', to: '/attach', tag: '애착', title: attach.style ?? (hasAttach(attach) ? '점수 입력함' : '가까운 사람과 어떻게 연결되나요?'), sub: hasAttach(attach) ? `${attach.source === 'ecrr' ? '검사 결과' : '입력한 결과'}${when('attach')}` : '검사 36문항 · 약 6분 · 결과 입력도 돼요', go: hasAttach(attach) ? '다시 하기' : '시작하기' },
    { m: 'temper', to: '/temper', tag: '기질', title: hasTemper(temper) ? temperText(temper) : '자극에 어떻게 반응하나요?', sub: hasTemper(temper) ? `${temper.source === 'ipip' ? '검사 결과' : '입력한 결과'}${when('temper')}` : '검사 32문항 · 약 4분 · 결과 입력도 돼요', go: hasTemper(temper) ? '다시 하기' : '시작하기' },
  ];
  return (
    <TabPage>
      <div className="anim" style={{ paddingTop: 28 }}>
        <h1>검사</h1>
        <p className="lead" style={{ marginTop: -4 }}>순서는 상관없어요. 다시 하면 새 기록으로 쌓여요.</p>
      </div>
      {cards.map((c, i) => (
        <Link key={c.m} to={c.to} className={`mod-card ${c.main ? 'main' : ''}`} style={{ '--c': PIECE_COLORS[i] } as React.CSSProperties}>
          <div className="mod-tag">{c.tag}</div>
          <div className="mod-title">{c.title}</div>
          <div className="mod-sub">{c.sub}</div>
          <span className="mod-go">{c.go}</span>
        </Link>
      ))}
    </TabPage>
  );
}

export function HistoryTab() {
  const { profile, history, setSnapshotLabel } = useStore();
  if (!profile.onboarded) return <Navigate to="/welcome" replace />;
  return (
    <TabPage>
      <div className="anim" style={{ paddingTop: 28 }}>
        <h1>기록</h1>
        <p className="lead" style={{ marginTop: -4 }}>일주일 안에 한 검사는 한 회차로 묶여요. 다시 하지 않은 검사는 이전 결과를 이어받아요.</p>
      </div>
      {history.length === 0 ? (
        <div className="card"><p className="note" style={{ margin: 0 }}>아직 기록이 없어요. 검사를 하나 하면 1회차가 생겨요.</p><Link to="/tests" className="link">검사하러 가기 ›</Link></div>
      ) : (<>
        <div className="sec" style={{ marginTop: 12 }}>한눈에 보기</div>
        <p className="sec-sub">회차를 누르면 그때의 나를 자세히 볼 수 있어요.</p>
        <HistoryBoard history={history} onLabel={setSnapshotLabel} />
        <div className="sec">가치관 네 축의 변화</div>
        <AxisChart history={history} />
        <div className="sec">회차별</div>
        {[...history].reverse().map((s) => {
          const i = history.indexOf(s);
          return (
            <Link key={s.id} to={`/history/${s.id}`} className="snap-row">
              <div className="snap-n">{i + 1}회차</div>
              <div className="snap-body">
                <b>{snapLabel(s, i)}</b><span>{fmtDate(s.at)} · 새로 한 검사 {s.changed.map(m => MODULE_NAME[m]).join(', ') || '없음'}</span>
              </div>
              <span className="snap-go">›</span>
            </Link>
          );
        })}
      </>)}
    </TabPage>
  );
}

export function SnapshotDetail() {
  const { id } = useParams();
  const { history, setSnapshotLabel } = useStore();
  const i = history.findIndex(s => s.id === id);
  if (i < 0) return <Navigate to="/history" replace />;
  const s = history[i], prev = i > 0 ? history[i - 1] : null;
  const diffs = prev ? diffLines(prev, s) : [];
  return (
    <div className="wrap" style={{ paddingBottom: 60 }}>
      <div className="top"><Link className="back" to="/history" aria-label="기록으로">‹</Link><span className="count" style={{ marginLeft: 'auto' }}>{i + 1}회차{i === history.length - 1 ? ' · 지금' : ''}</span></div>
      <div className="anim" style={{ paddingTop: 12 }}>
        <div className="part" style={{ marginTop: 8 }}>{fmtDate(s.at)}{s.updatedAt - s.at > 86400000 ? ` ~ ${fmtDate(s.updatedAt)}` : ''}</div>
        <h1 style={{ marginTop: 0 }}><LabelEdit value={snapLabel(s, i)} onSave={v => setSnapshotLabel(s.id, v)} /></h1>
      </div>
      <div className="now-card">
        {MODULE_KEYS.map((m, mi) => (
          <div key={m} className="now-row" style={{ '--c': PIECE_COLORS[mi] } as React.CSSProperties}>
            <span className="now-dot" />
            <div className="now-k">{MODULE_NAME[m]}</div>
            {s[m] ? <div className="now-v"><b>{moduleTitle(m, s)} {s.changed.includes(m) ? <em className="new-badge">{i === 0 ? '처음' : '새로'}</em> : <em className="kept-badge">유지</em>}</b><span>{moduleDetail(m, s)}</span></div>
              : <div className="now-v empty"><span>비어 있었어요</span></div>}
          </div>
        ))}
      </div>
      {prev && (<>
        <div className="sec">{i}회차와 달라진 점</div>
        <div className="card">{diffs.length ? diffs.map(t => <p key={t} className="signal">{t}</p>) : <p className="note" style={{ margin: 0 }}>눈에 띄는 변화는 없었어요.</p>}</div>
      </>)}
      {s.values && (<>
        <div className="sec">그때의 가치관 결과</div>
        <ValuesReport answers={s.values} />
      </>)}
    </div>
  );
}

export function AnalyzeTab() {
  const { profile, history, values, mbti, attach, temper } = useStore();
  const [purpose, setPurpose] = useState<Purpose>('general');
  const [withHistory, setWithHistory] = useState(true);
  const [copied, setCopied] = useState(false);
  const any = isComplete(values) || hasMbti(mbti) || hasAttach(attach) || hasTemper(temper);
  const text = useMemo(() => buildPrompt({ name: profile.name, history: withHistory ? history : undefined, values, valuesResult: isComplete(values) ? fullResult(values) : null, mbti, attach, temper }, purpose),
    [profile.name, withHistory, history, values, mbti, attach, temper, purpose]);
  if (!profile.onboarded) return <Navigate to="/welcome" replace />;
  return (
    <TabPage>
      <div className="anim" style={{ paddingTop: 28 }}>
        <h1>나를 분석하기</h1>
        <p className="lead" style={{ marginTop: -4 }}>무엇이 궁금한지 고르면, 내 검사 결과와 그에 맞춘 질문을 한 번에 복사해요. 전문가에게 보내거나 ChatGPT·Claude 같은 AI에 붙여넣어 분석받을 수 있어요.</p>
      </div>
      {!any ? (
        <div className="card"><p className="note" style={{ margin: 0 }}>검사를 하나 이상 하면 분석 자료를 만들 수 있어요.</p><Link to="/tests" className="link">검사하러 가기 ›</Link></div>
      ) : (<>
        <div className="sec" style={{ marginTop: 12 }}>무엇이 궁금한가요?</div>
        <div className="chips">
          {PURPOSES.map(p => <button key={p.key} className={`chip-btn ${purpose === p.key ? 'sel' : ''}`} onClick={() => { setPurpose(p.key); setCopied(false); }}>{p.label}</button>)}
        </div>
        {history.length >= 2 && (
          <label className="check"><input type="checkbox" checked={withHistory} onChange={e => { setWithHistory(e.target.checked); setCopied(false); }} />
            변화 기록도 함께 넣기 <span className="note">({history.length}회차)</span></label>
        )}
        <details className="preview">
          <summary>들어가는 내용 미리보기</summary>
          <pre>{text}</pre>
        </details>
        <p className="note">나란 검사는 처음 보는 사람도 해석할 수 있게, 무엇을 재는지 설명과 근거가 된 내 답을 함께 넣었어요. 복사한 내용은 내가 붙여넣는 곳으로만 전달돼요.</p>
        <button className="ghost primary" style={{ marginTop: 12 }} onClick={async () => { await copyText(text); setCopied(true); }}>{copied ? '복사했어요 · 붙여넣어 주세요' : '분석 자료 복사하기'}</button>
      </>)}
    </TabPage>
  );
}
