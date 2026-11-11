import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppLayout } from './layouts/AppLayout';
import { ProtectedRoute } from './layouts/ProtectedRoute';

// Pages
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { StudentDashboard } from './pages/student/StudentDashboard';
import { FacultyDashboard } from './pages/faculty/FacultyDashboard';
import { ChatPage } from './pages/chat/ChatPage';
import { DocumentCatalogPage } from './pages/documents/DocumentCatalogPage';
import { ProfilePage } from './pages/common/ProfilePage';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminDocumentsPage } from './pages/admin/AdminDocumentsPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { AdminAnalyticsPage } from './pages/admin/AdminAnalyticsPage';

const RootRedirect = () => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'admin') return <Navigate to="/admin" replace />;
  if (user.role === 'faculty') return <Navigate to="/faculty" replace />;
  return <Navigate to="/student" replace />;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Root Redirect */}
          <Route path="/" element={<RootRedirect />} />

          {/* Protected Application Routes inside AppLayout */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              {/* Common Routes */}
              <Route path="/chat" element={<ChatPage />} />
              <Route path="/documents" element={<DocumentCatalogPage />} />
              <Route path="/profile" element={<ProfilePage />} />

              {/* Student Routes */}
              <Route element={<ProtectedRoute allowedRoles={['student', 'admin']} />}>
                <Route path="/student" element={<StudentDashboard />} />
              </Route>

              {/* Faculty Routes */}
              <Route element={<ProtectedRoute allowedRoles={['faculty', 'admin']} />}>
                <Route path="/faculty" element={<FacultyDashboard />} />
              </Route>

              {/* Admin Routes */}
              <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/documents" element={<AdminDocumentsPage />} />
                <Route path="/admin/users" element={<AdminUsersPage />} />
                <Route path="/admin/analytics" element={<AdminAnalyticsPage />} />
              </Route>
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
