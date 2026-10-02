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
// 크롬·안드로이드: beforeinstallprompt 로 바로 설치 창. iOS 사파리: 그런 기능이 없어 '공유 → 홈 화면에 추가' 안내.
// 이미 설치해서 앱으로 열었으면 띄우지 않고, '나중에'를 누르면 2주 동안 다시 띄우지 않는다.

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

export function InstallBanner() {
  const [, force] = useState(0);
  const [hidden, setHidden] = useState(() => isStandalone() || snoozed());
  useEffect(() => { const f = () => force(x => x + 1); bipListeners.add(f); return () => { bipListeners.delete(f); }; }, []);
  // 첫 화면에서 바로 띄우지 않고 조금 둘러본 뒤에
  const [ready, setReady] = useState(false);
  useEffect(() => { const t = setTimeout(() => setReady(true), 20000); return () => clearTimeout(t); }, []);
  const ios = isIOS();
  if (hidden || !ready || (!deferred && !ios)) return null;
  const snooze = () => { try { localStorage.setItem(SNOOZE_KEY, String(Date.now())); } catch { /* 저장 못 해도 이번엔 닫는다 */ } setHidden(true); };
  return (
    <div className="app-banner install" role="dialog" aria-label="앱 설치">
      <img src="./web-app-manifest-192x192.png" alt="" className="ab-icon" />
      <div className="ab-text">
        <b>홈 화면에 나란 추가하기</b>
        <span>{ios ? '아래 공유 버튼 → "홈 화면에 추가"를 누르면 앱처럼 쓸 수 있어요.' : '앱처럼 바로 열고, 인터넷이 없어도 기록을 볼 수 있어요.'}</span>
      </div>
      {!ios && deferred && (
        <button className="ab-btn" onClick={async () => { const d = deferred!; await d.prompt(); await d.userChoice; deferred = null; setHidden(true); }}>설치</button>
      )}
      <button className="ab-x" onClick={snooze} aria-label="나중에">✕</button>
    </div>
  );
}
