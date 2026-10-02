import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import Welcome from './pages/Welcome';
import Me from './pages/Me';
import ValuesTest from './pages/ValuesTest';
import ValuesResult from './pages/ValuesResult';
import Settings from './pages/Settings';
import PublicTest, { PublicTestResult } from './pages/PublicTest';
import { AnalyzeTab, HistoryTab, SnapshotDetail, TestsTab } from './pages/Tabs';
import { AttachInput, MbtiInput, TemperInput } from './pages/Inputs';
import './styles.css';
import { useStore } from './store/useStore';
import { UpdateBanner } from './components/AppBanners';
import { watchAppUpdate } from './lib/appUpdate';

// 새 버전 감지 (운영 빌드에서만, 10분마다 + 탭으로 돌아올 때)
watchAppUpdate();

// 기록 기능 이전에 저장된 결과도 1회차로 남긴다 (persist 는 localStorage 에서 동기 복원됨)
useStore.getState().recordHistory();

// 개발 모드 전용: #/demo 로 열면 데모 기록을 넣고 홈으로 (빌드에는 포함되지 않음)
if (import.meta.env.DEV && location.hash === '#/demo') {
  const { loadDemo } = await import('./dev/demo');
  loadDemo();
  history.replaceState(null, '', '#/');
}

// 정적 호스팅(서버 없음)이라 HashRouter — 새로고침해도 404가 나지 않는다
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <Routes>
        <Route path="/" element={<Me />} />
        <Route path="/tests" element={<TestsTab />} />
        <Route path="/history" element={<HistoryTab />} />
        <Route path="/history/:id" element={<SnapshotDetail />} />
        <Route path="/analyze" element={<AnalyzeTab />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/test/:kind" element={<PublicTest />} />
        <Route path="/test/:kind/result" element={<PublicTestResult />} />
        <Route path="/welcome" element={<Welcome />} />
        <Route path="/me" element={<Navigate to="/" replace />} />
        <Route path="/values" element={<ValuesTest />} />
        <Route path="/values/result" element={<ValuesResult />} />
        <Route path="/mbti" element={<MbtiInput />} />
        <Route path="/attach" element={<AttachInput />} />
        <Route path="/temper" element={<TemperInput />} />
        <Route path="/export" element={<Navigate to="/analyze" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <UpdateBanner />
    </HashRouter>
  </StrictMode>,
);
