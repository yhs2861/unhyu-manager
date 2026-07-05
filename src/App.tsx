import { HashRouter, Route, Routes } from 'react-router-dom';
import BottomNavigation from './components/BottomNavigation';
import CalendarPage from './pages/Calendar/CalendarPage';
import HomePage from './pages/Home/HomePage';
import SettingsPage from './pages/Settings/SettingsPage';
import StatisticsPage from './pages/Statistics/StatisticsPage';
import WorkInputPage from './pages/WorkInput/WorkInputPage';

function App() {
  return (
    <HashRouter>
      <div className="app-layout">
        <Routes>
          <Route element={<HomePage />} path="/" />
          <Route element={<WorkInputPage />} path="/input" />
          <Route element={<CalendarPage />} path="/calendar" />
          <Route element={<StatisticsPage />} path="/statistics" />
          <Route element={<SettingsPage />} path="/settings" />
        </Routes>
        <BottomNavigation />
      </div>
    </HashRouter>
  );
}

export default App;
