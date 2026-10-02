// 하단 탭: 나 / 검사 / 기록 / 분석. 검사 진행·입력 같은 몰입 화면에서는 쓰지 않는다.
import { NavLink } from 'react-router-dom';

const I = {
  me: <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0" />,
  tests: <><rect x="5" y="3.5" width="14" height="17" rx="3" /><path d="M9 9h6M9 13h6M9 17h3" /></>,
  history: <><path d="M4 12a8 8 0 1 0 2.3-5.6" /><path d="M4 4v4h4M12 8v4l3 2" /></>,
  analyze: <><path d="M4 19V9M10 19V5M16 19v-7M21 19H3" /></>,
};

const TABS = [
  { to: '/', label: '나', icon: I.me, end: true },
  { to: '/tests', label: '검사', icon: I.tests },
  { to: '/history', label: '기록', icon: I.history },
  { to: '/analyze', label: '분석', icon: I.analyze },
];

export default function TabBar() {
  return (
    <nav className="tabbar" aria-label="주요 메뉴">
      {TABS.map(t => (
        <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => `tab ${isActive ? 'on' : ''}`}>
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{t.icon}</svg>
          <span>{t.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

/** 탭이 있는 화면 공통 틀 */
export function TabPage({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="wrap tabbed">{children}</div>
      <TabBar />
    </>
  );
}
