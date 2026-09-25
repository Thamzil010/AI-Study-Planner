import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';
import MainLayout from './layouts/MainLayout';
// Placeholder components, we'll implement these next
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Subjects from './pages/Subjects';
import Settings from './pages/Settings';

import TodaysPlan from './pages/TodaysPlan';
import Reports from './pages/Reports';
import History from './pages/History';
import Profile from './pages/Profile';
import Quizzes from './pages/Quizzes';
import NotificationManager from './components/NotificationManager';
import { Toaster } from 'react-hot-toast';

import React from 'react';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          
          <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="settings" element={<Settings />} />
            <Route path="profile" element={<Profile />} />
            <Route path="subjects" element={<Subjects />} />
            <Route path="todays-plan" element={<TodaysPlan />} />
            <Route path="history" element={<History />} />
            <Route path="quizzes" element={<Quizzes />} />
            <Route path="reports" element={<Reports />} />
          </Route>
          
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
      <NotificationManager />
      <Toaster position="top-right" />
    </AuthProvider>
  );
}

export default App;
