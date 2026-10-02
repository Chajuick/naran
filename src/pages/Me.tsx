// 나 탭 (첫 화면) — 나라는 사람: 지금의 나, 검사 사이에서 보이는 것, 최근 변화
import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import Pieces, { PIECE_COLORS } from '../components/Pieces';
import { TabPage } from '../components/TabBar';
import { InstallCard } from '../components/AppBanners';
import { fmtDate, MODULE_KEYS, MODULE_NAME, type ModuleKey, type Snapshot } from '../lib/history';
import { crossSignals } from '../lib/export/prompt';
import { attachDetail, diffLines, mbtiDetail, moduleTitle, temperDetail, valuesResult } from '../lib/summary';
import { useStore } from '../store/useStore';

export const MOD_LINK: Record<ModuleKey, string> = { values: '/values/result', mbti: '/mbti', attach: '/attach', temper: '/temper' };
export const MOD_START: Record<ModuleKey, string> = { values: '/values', mbti: '/mbti', attach: '/attach', temper: '/temper' };

export function moduleDetail(m: ModuleKey, s: Snapshot) {
  if (m === 'values') return valuesResult(s)?.type.tagline ?? '';
  if (m === 'mbti') return mbtiDetail(s.mbti);
  if (m === 'attach') return attachDetail(s.attach);
  return temperDetail(s.temper);
}

const Gear = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
  </svg>
);

export default function Me() {
  const { profile, history, setProfile } = useStore();
  const cur = history[history.length - 1];
  const prev = history.length >= 2 ? history[history.length - 2] : null;
  const filled = MODULE_KEYS.map(m => !!cur?.[m]);
  const count = filled.filter(Boolean).length;
  const [celebrate, setCelebrate] = useState(count === 4 && !profile.celebrated);
  if (!profile.onboarded) return <Navigate to="/welcome" replace />;
  const label = profile.name ? profile.name.slice(0, 2) : '나';
  const obj = profile.name ? `${profile.name}님을` : '나를';
  const top = <div className="top"><span className="brand">나란</span><Link to="/settings" className="gear" aria-label="설정"><Gear /></Link></div>;

  if (!cur) return (
    <TabPage>
      {top}
      <div className="anim" style={{ paddingTop: 28, textAlign: 'center' }}>
        <Pieces filled={[false, false, false, false]} size={150} label={label} />
        <h1>{obj}<br />채워볼까요?</h1>
        <p className="lead">검사를 하나 하면 첫 번째 조각이 채워지고, 그때부터 나의 기록이 시작돼요.</p>
        <Link to="/tests" className="ghost primary" style={{ display: 'block', maxWidth: 280, margin: '20px auto 0', textAlign: 'center' }}>첫 조각 채우기</Link>
      </div>
    </TabPage>
  );

  const signals = crossSignals(valuesResult(cur), cur.mbti ?? { letters: {}, pct: {} }, cur.attach ?? {}, cur.temper ?? { pct: {} });
  const diffs = prev ? diffLines(prev, cur) : [];
  const missing = MODULE_KEYS.filter(m => !cur[m]);

  return (
    <TabPage>
      {celebrate && (
        <div className="celebrate" onClick={() => { setCelebrate(false); setProfile({ ...profile, celebrated: true }); }}>
          <div className="anim celebrate-in">
            <Pieces filled={[true, true, true, true]} size={200} label={label} animate delay={0.2} />
            <h1>{profile.name ? `${profile.name}님이` : '내가'} 다 모였어요</h1>
            <p className="lead">네 조각이 모두 채워졌어요.<br />이제 검사 사이를 이어서 볼 수 있어요.</p>
            <button className="ghost primary" style={{ maxWidth: 280, margin: '18px auto 0' }}>{profile.name ? `${profile.name}님` : '나'} 보러 가기</button>
          </div>
        </div>
      )}
      {top}

      <div className="me-head anim">
        <Pieces filled={filled} size={92} label={label} animate />
        <div>
          <h1 style={{ margin: 0 }}>{profile.name ? `${profile.name}님이라는 사람` : '나라는 사람'}</h1>
          <p className="note" style={{ margin: '4px 0 0' }}>{history.length}회차 · 마지막 기록 {fmtDate(cur.updatedAt)}</p>
        </div>
      </div>
      {missing.length > 0 && (
        <Link to="/tests" className="fill-hint"><span>{missing.map(m => MODULE_NAME[m]).join(', ')} 조각이 비어 있어요</span><b>채우기 ›</b></Link>
      )}
      <InstallCard />

      <div className="sec" style={{ marginTop: 24 }}>지금의 나</div>
      <div className="now-card">
        {MODULE_KEYS.map((m, i) => (
          <Link key={m} to={cur[m] ? MOD_LINK[m] : MOD_START[m]} className="now-row" style={{ '--c': PIECE_COLORS[i] } as React.CSSProperties}>
            <span className="now-dot" />
            <div className="now-k">{MODULE_NAME[m]}</div>
            {cur[m]
              ? <div className="now-v"><b>{moduleTitle(m, cur)}</b><span>{moduleDetail(m, cur)}</span></div>
              : <div className="now-v empty"><span>아직 비어 있어요</span><span className="link">채우기</span></div>}
          </Link>
        ))}
      </div>

      <div className="sec">검사 사이에서 보이는 것</div>
      <div className="card">
        {signals.length
          ? <>{signals.map(t => <p key={t} className="signal">{t}</p>)}<p className="note" style={{ margin: '8px 0 0' }}>확정이 아니라 단서예요. 분석 탭에서 더 깊이 볼 수 있어요.</p></>
          : <p className="note" style={{ margin: 0 }}>{count === 4 ? '지금 조합에선 검사끼리 크게 어긋나는 곳이 없어요. 서로 잘 맞물려 있어요.' : '조각이 더 모이면 검사 사이의 연결을 보여드릴게요.'}</p>}
      </div>

      {prev && (<>
        <div className="sec">지난 회차와 달라진 점</div>
        <div className="card">
          {diffs.length ? diffs.map(t => <p key={t} className="signal">{t}</p>) : <p className="note" style={{ margin: 0 }}>지난 회차와 비교해 눈에 띄는 변화는 없어요.</p>}
          <Link to="/history" className="link">기록 전체 보기 ›</Link>
        </div>
      </>)}

      <Link to="/analyze" className="ghost primary" style={{ display: 'block', textAlign: 'center', marginTop: 20 }}>나를 분석하기</Link>
    </TabPage>
  );
}
