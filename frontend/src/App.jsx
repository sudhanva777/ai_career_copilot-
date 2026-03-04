import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import AppShell from './components/layout/AppShell';
import Background from './components/layout/Background';
import NotificationStack from './components/common/NotificationStack';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import UploadPage from './pages/UploadPage';
import AnalysisPage from './pages/AnalysisPage';
import InterviewPage from './pages/InterviewPage';
import InterviewSummaryPage from './pages/InterviewSummaryPage';
import ResumesPage from './pages/ResumesPage';
import RewritePage from './pages/RewritePage';
import HistoryPage from './pages/HistoryPage';
import JobMatchPage from './pages/JobMatchPage';
import ReportPage from './pages/ReportPage';

function ProtectedRoute({ children }) {
  const { isAuthed } = useAuth();
  return isAuthed ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { isAuthed } = useAuth();
  return !isAuthed ? children : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Background />
      <NotificationStack />
      <Routes>
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
        <Route path="/report/:resumeId" element={<ProtectedRoute><ReportPage /></ProtectedRoute>} />
        <Route path="/*" element={
          <ProtectedRoute>
            <AppShell>
              <Routes>
                <Route index element={<DashboardPage />} />
                <Route path="upload" element={<UploadPage />} />
                <Route path="analysis" element={<AnalysisPage />} />
                <Route path="interview" element={<InterviewPage />} />
                <Route path="interview/summary/:sessionId" element={<InterviewSummaryPage />} />
                <Route path="resumes" element={<ResumesPage />} />
                <Route path="rewrite/:resumeId" element={<RewritePage />} />
                <Route path="history" element={<HistoryPage />} />
                <Route path="jobs" element={<JobMatchPage />} />
              </Routes>
            </AppShell>
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}
