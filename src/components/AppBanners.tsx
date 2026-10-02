// 화면 아래에 뜨는 알림 두 가지: 새 버전 알림, 앱 설치 안내.
import { useEffect, useState } from 'react';
import { applyAppUpdate, onAppUpdate } from '../lib/appUpdate';

/** 새 버전 배너 — 누르면 캐시를 비우고 새로 받는다. 검사 중일 수 있어 저절로 새로고침하지 않는다 */
export function UpdateBanner() {
  const [show, setShow] = useState(false);
  useEffect(() => onAppUpdate(() => setShow(true)), []);
  if (!show) return null;
  return (
    <div className="app-banner" role="status">
      <div className="ab-text"><b>새 버전이 나왔어요</b><span>눌러야 새 화면으로 바뀌어요. 내 기록은 그대로예요.</span></div>
      <button className="ab-btn" onClick={applyAppUpdate}>지금 받기</button>
      <button className="ab-x" onClick={() => setShow(false)} aria-label="나중에">✕</button>
    </div>
  );
}

// ── 앱 설치 안내 ──
// 화면 위에 떠 있지 않고, 나 탭 안에 카드로 들어간다 (첫 기록이 생긴 뒤 — 지킬 기록이 있을 때 권하는 게 자연스럽다).
// 크롬·안드로이드: beforeinstallprompt 로 바로 설치 창. iOS 사파리: 그런 기능이 없어 '공유 → 홈 화면에 추가' 안내.
// 이미 설치해서 앱으로 열었으면 안 보이고, 카드의 ✕ 는 2주 동안 숨긴다. 설정의 '홈 화면에 추가' 줄은 숨김과 상관없이 늘 있다.

interface BIPEvent extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }
const SNOOZE_KEY = 'naran-install-snooze';
const SNOOZE_MS = 14 * 24 * 60 * 60 * 1000;

const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent);
const snoozed = () => { try { return Date.now() - Number(localStorage.getItem(SNOOZE_KEY) || 0) < SNOOZE_MS; } catch { return false; } };

let deferred: BIPEvent | null = null;
const bipListeners = new Set<() => void>();
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e as BIPEvent; bipListeners.forEach(f => f()); });
  window.addEventListener('appinstalled', () => { deferred = null; bipListeners.forEach(f => f()); });
}

/** 지금 이 브라우저에서 설치를 권할 수 있는지 + 설치 실행 */
function useInstall() {
  const [, force] = useState(0);
  useEffect(() => { const f = () => force(x => x + 1); bipListeners.add(f); return () => { bipListeners.delete(f); }; }, []);
  const ios = isIOS();
  const can = !isStandalone() && (!!deferred || ios);
  const install = async () => { const d = deferred; if (!d) return; await d.prompt(); await d.userChoice; deferred = null; force(x => x + 1); };
  return { can, ios, install, direct: !!deferred };
}

const IOS_HINT = '사파리 아래 공유 버튼 → "홈 화면에 추가"를 누르면 앱처럼 쓸 수 있어요.';

/** 나 탭 카드 */
export function InstallCard() {
  const { can, ios, install, direct } = useInstall();
  const [hidden, setHidden] = useState(snoozed);
  if (!can || hidden) return null;
  const snooze = () => { try { localStorage.setItem(SNOOZE_KEY, String(Date.now())); } catch { /* 저장 못 해도 이번엔 닫는다 */ } setHidden(true); };
  return (
    <div className="install-card anim">
      <img src="./web-app-manifest-192x192.png" alt="" className="ab-icon" />
      <div className="ab-text">
        <b>홈 화면에 나란 두기</b>
        <span>{ios ? IOS_HINT : '앱처럼 바로 열고, 인터넷이 없어도 기록을 볼 수 있어요.'}</span>
      </div>
      {!ios && direct && <button className="ab-btn" onClick={install}>설치</button>}
      <button className="ab-x" onClick={snooze} aria-label="나중에">✕</button>
    </div>
  );
}

/** 설정 화면 줄 — 숨김과 상관없이 설치할 수 있을 때 늘 보인다 */
export function InstallRow() {
  const { can, ios, install, direct } = useInstall();
  const [open, setOpen] = useState(false);
  if (!can) return null;
  if (!ios && direct) return <button className="setting-row" onClick={install}>홈 화면에 추가<span>›</span></button>;
  return (<>
    <button className="setting-row" onClick={() => setOpen(o => !o)}>홈 화면에 추가<span>{open ? '⌃' : '›'}</span></button>
    {open && <p className="note" style={{ margin: '0 4px 8px' }}>{IOS_HINT}</p>}
  </>);
}
