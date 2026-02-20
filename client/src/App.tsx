import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';

// Researcher pages
import LoginPage from './pages/researcher/LoginPage';
import DashboardPage from './pages/researcher/DashboardPage';
import StudyCreatePage from './pages/researcher/StudyCreatePage';
import StudyEditPage from './pages/researcher/StudyEditPage';
import StudyResultsPage from './pages/researcher/StudyResultsPage';

// Participant pages
import StudyLandingPage from './pages/participant/StudyLandingPage';
import SortCanvasPage from './pages/participant/SortCanvasPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { researcher, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen text-gray-500">Loading...</div>;
  if (!researcher) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Researcher */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/studies/new" element={<ProtectedRoute><StudyCreatePage /></ProtectedRoute>} />
      <Route path="/studies/:id/edit" element={<ProtectedRoute><StudyEditPage /></ProtectedRoute>} />
      <Route path="/studies/:id/results" element={<ProtectedRoute><StudyResultsPage /></ProtectedRoute>} />

      {/* Participant */}
      <Route path="/s/:token" element={<StudyLandingPage />} />
      <Route path="/s/:token/sort" element={<SortCanvasPage />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
