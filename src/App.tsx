import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { NotificationProvider } from './hooks/useNotifications';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import NewPatient from './pages/NewPatient';
import PatientDetail from './pages/PatientDetail';
import Reminders from './pages/Reminders';
import Profile from './pages/Profile';
import RiskAssessment from './pages/RiskAssessment';
import Layout from './components/Layout';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center text-primary">Loading...</div>;
  return user ? <Layout>{children}</Layout> : <Navigate to="/login" />;
}

export default function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path="/patients" element={<PrivateRoute><Patients /></PrivateRoute>} />
            <Route path="/patients/new" element={<PrivateRoute><NewPatient /></PrivateRoute>} />
            <Route path="/patients/:id" element={<PrivateRoute><PatientDetail /></PrivateRoute>} />
            <Route path="/reminders" element={<PrivateRoute><Reminders /></PrivateRoute>} />
            <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
            <Route path="/risk/:id" element={<PrivateRoute><RiskAssessment /></PrivateRoute>} />
          </Routes>
        </BrowserRouter>
      </NotificationProvider>
    </AuthProvider>
  );
}
