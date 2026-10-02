/**
 * 새 버전 배포 감지 — focus-accounter/src/lib/appUpdate.js 를 서버 없는 앱에 맞게 옮김.
 *
 * ── 왜 필요한가 ──
 * PWA 서비스워커가 index.html·번들을 선캐시한다. 배포해도 열려 있는 탭은 옛 자바스크립트를 계속 쓰고,
 * 새로고침해도 워커가 옛 파일을 먼저 내주면 한 번 더 새로고침해야 반영된다.
 *
 * ── 무엇으로 판단하는가 ──
 * 나란은 서버가 없으므로, 빌드 때 함께 나가는 `version.json`(build id)을 캐시 없이 다시 받아
 * 이 번들에 박힌 __BUILD_ID__ 와 비교한다. 서비스워커 controllerchange 는 보조 신호.
 *
 * ── 왜 자동 새로고침을 하지 않는가 ──
 * 검사를 푸는 도중일 수 있다. 답은 localStorage 에 저장되지만, 문항 화면이 갑자기 바뀌면 놀란다.
 * 그래서 알리고, 누르면 그때 새로고침한다.
 *
 * ⚠ 캐시를 비울 때 localStorage(검사 답·기록)는 건드리지 않는다. Cache Storage·서비스워커만 정리한다.
 */

declare const __BUILD_ID__: string;
declare const __APP_VERSION__: string;

export const APP_VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev';
export const BUILD_ID = typeof __BUILD_ID__ === 'string' ? __BUILD_ID__ : 'dev';

type Listener = (info: { from: string; to: string | null }) => void;
const listeners = new Set<Listener>();
let updated = false;
let next: string | null = null;

const markUpdated = (to: string | null = null) => {
  if (updated) return;
  updated = true;
  next = to;
  listeners.forEach(fn => fn({ from: BUILD_ID, to }));
};

/** 새 버전이 준비됐는지 구독. @returns 해제 함수 */
export function onAppUpdate(fn: Listener) {
  listeners.add(fn);
  if (updated) fn({ from: BUILD_ID, to: next });
  return () => { listeners.delete(fn); };
}

/** 새 버전으로 갈아탄다 — 워커 등록 해제 + Cache Storage 비우기 + 새로고침 (localStorage 는 그대로) */
export async function applyAppUpdate() {
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r => r.unregister()));
    }
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    }
  } catch { /* 정리에 실패해도 새로고침은 한다 */ }
  window.location.reload();
}

const CHECK_INTERVAL_MS = 10 * 60 * 1000;

async function latestBuild(): Promise<string | null> {
  try {
    const r = await fetch(`./version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!r.ok) return null;
    const j = await r.json();
    return typeof j?.build === 'string' ? j.build : null;
  } catch { return null; } // 오프라인 — 다음에 다시
}

async function check() {
  if (updated) return;
  const b = await latestBuild();
  if (b && b !== BUILD_ID) markUpdated(b);
}

/** 앱 시작 시 1회 (main.tsx). 운영 빌드에서만 */
export function watchAppUpdate() {
  if (import.meta.env.DEV) return;
  check();
  setInterval(check, CHECK_INTERVAL_MS);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
  // 보조: 워커가 새 버전으로 바뀐 순간 (첫 설치 때의 controllerchange 는 제외)
  if ('serviceWorker' in navigator) {
    const hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadController) markUpdated(); });
  }
}
