import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { StudyHubPage } from './pages/study/StudyHubPage';
import { FlashcardsPage } from './pages/study/FlashcardsPage';
import { QuizPage } from './pages/study/QuizPage';
import { ResearchPage } from './pages/research/ResearchPage';
import { SettingsPage } from './pages/settings/SettingsPage';
import AuthPage from './pages/auth/AuthPage';
import { authApi } from './lib/api/auth';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(authApi.isAuthenticated());

  const handleAuthSuccess = () => {
    setIsAuthenticated(true);
  };

  if (!isAuthenticated) {
    return <AuthPage onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/study" element={<StudyHubPage />} />
          <Route path="/flashcards" element={<FlashcardsPage />} />
          <Route path="/quiz" element={<QuizPage />} />
          <Route path="/research" element={<ResearchPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
