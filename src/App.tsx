import { useEffect, useState, type ReactElement } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import BottomNavigation from './components/BottomNavigation';
import CalendarPage from './pages/Calendar/CalendarPage';
import HomePage from './pages/Home/HomePage';
import SettingsPage from './pages/Settings/SettingsPage';
import SetupPage from './pages/Setup/SetupPage';
import StatisticsPage from './pages/Statistics/StatisticsPage';
import WorkInputPage from './pages/WorkInput/WorkInputPage';
import { APP_VERSION } from './appVersion';
import { getSettings } from './storage/SettingsStorage';

function guardSetup(element: ReactElement, isSetupCompleted: boolean) {
  return isSetupCompleted ? element : <Navigate replace to="/setup" />;
}

function AppRoutes() {
  const location = useLocation();
  const settings = getSettings();
  const showBottomNavigation = settings.isSetupCompleted && location.pathname !== '/setup';

  return (
    <div className="app-layout">
      <Routes>
        <Route element={<SetupPage />} path="/setup" />
        <Route element={guardSetup(<HomePage />, settings.isSetupCompleted)} path="/" />
        <Route element={guardSetup(<WorkInputPage />, settings.isSetupCompleted)} path="/input" />
        <Route element={guardSetup(<CalendarPage />, settings.isSetupCompleted)} path="/calendar" />
        <Route element={guardSetup(<StatisticsPage />, settings.isSetupCompleted)} path="/statistics" />
        <Route element={guardSetup(<SettingsPage />, settings.isSetupCompleted)} path="/settings" />
      </Routes>
      {showBottomNavigation ? <BottomNavigation /> : null}
    </div>
  );
}

function App() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timerId = window.setTimeout(() => setShowSplash(false), 1500);

    return () => window.clearTimeout(timerId);
  }, []);

  if (showSplash) {
    return (
      <main className="splash-screen" aria-label="앱 시작 화면">
        <div className="splash-logo-wrap">
          <img
            alt="회사 마크"
            className="splash-company-logo"
            src={`${import.meta.env.BASE_URL}branding/company-mark-color.png`}
          />
        </div>
        <div className="splash-copy">
          <h1>운휴매니저</h1>
          <p>광양항 근태관리</p>
          <span>Version {APP_VERSION}</span>
        </div>
      </main>
    );
  }

  return (
    <HashRouter>
      <AppRoutes />
    </HashRouter>
  );
}

export default App;
