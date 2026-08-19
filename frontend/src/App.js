// frontend/src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';

// Layout & shared components
import Layout from './components/Layout';
import PanicButton from './components/PanicButton';
import Chatbot from './components/Chatbot';
import PrivateRoute from './components/PrivateRoute';
import { AppThemeProvider } from './context/ThemeContext';

// Pages
import Login from './components/Login';
import DoctorDashboard from './components/DoctorDashboard';
import PatientDashboard from './components/PatientDashboard';
import PatientList from './components/PatientList';
import PatientDetail from './components/PatientDetail';
import SubmitReport from './components/SubmitReport';
import Notifications from './components/Notifications';
import ProfileSettings from './components/ProfileSettings';
import RegisterPatient from './components/RegisterPatient';
import PatientAppointments from './components/PatientAppointments';
import DoctorAppointments from './components/DoctorAppointments';
import UserManagement from './components/UserManagement';
import PatientReportSummary from './components/PatientReportSummary';

// ============================================================
// NEW PAGES (Supervisor Feedback Implementation)
// ============================================================
import PatientSearch from './pages/PatientSearch';
import ReportResults from './pages/ReportResults';

function App() {
    const storedUser = localStorage.getItem('user');
    const user = storedUser ? JSON.parse(storedUser) : null;
    const isDoctor = user?.role === 'doctor';
    const isPatient = user?.role === 'patient';

    return (
        <AppThemeProvider>
            <Router>
                {user ? (
                    <>
                        {/* Floating buttons only for patients */}
                        {isPatient && (
                            <>
                                <PanicButton />
                                <Chatbot />
                            </>
                        )}
                        <Layout>
                            <Routes>
                                {/* =========================================================
                                    DOCTOR-ONLY ROUTES
                                ========================================================= */}
                                <Route
                                    path="/"
                                    element={
                                        <PrivateRoute allowedRoles={['doctor']}>
                                            <DoctorDashboard />
                                        </PrivateRoute>
                                    }
                                />
                                <Route
                                    path="/reports-summary"
                                    element={
                                        <PrivateRoute allowedRoles={['doctor']}>
                                            <PatientReportSummary />
                                        </PrivateRoute>
                                    }
                                />
                                <Route
                                    path="/patients"
                                    element={
                                        <PrivateRoute allowedRoles={['doctor']}>
                                            <PatientList />
                                        </PrivateRoute>
                                    }
                                />
                                <Route
                                    path="/register"
                                    element={
                                        <PrivateRoute allowedRoles={['doctor']}>
                                            <RegisterPatient />
                                        </PrivateRoute>
                                    }
                                />
                                <Route
                                    path="/doctor-appointments"
                                    element={
                                        <PrivateRoute allowedRoles={['doctor']}>
                                            <DoctorAppointments />
                                        </PrivateRoute>
                                    }
                                />
                                <Route
                                    path="/user-management"
                                    element={
                                        <PrivateRoute allowedRoles={['doctor']}>
                                            <UserManagement />
                                        </PrivateRoute>
                                    }
                                />

                                {/* =========================================================
                                    PATIENT-ONLY ROUTES
                                ========================================================= */}
                                <Route
                                    path="/patient-dashboard"
                                    element={
                                        <PrivateRoute allowedRoles={['patient']}>
                                            <PatientDashboard />
                                        </PrivateRoute>
                                    }
                                />
                                <Route
                                    path="/appointments"
                                    element={
                                        <PrivateRoute allowedRoles={['patient']}>
                                            <PatientAppointments />
                                        </PrivateRoute>
                                    }
                                />

                                {/* =========================================================
                                    SHARED / PROTECTED ROUTES (Doctor + Patient)
                                ========================================================= */}
                                <Route
                                    path="/patient/:id"
                                    element={
                                        <PrivateRoute>
                                            <PatientDetail />
                                        </PrivateRoute>
                                    }
                                />
                                <Route
                                    path="/reports"
                                    element={
                                        <PrivateRoute>
                                            <SubmitReport />
                                        </PrivateRoute>
                                    }
                                />
                                <Route
                                    path="/notifications"
                                    element={
                                        <PrivateRoute>
                                            <Notifications />
                                        </PrivateRoute>
                                    }
                                />
                                <Route
                                    path="/profile"
                                    element={
                                        <PrivateRoute>
                                            <ProfileSettings />
                                        </PrivateRoute>
                                    }
                                />

                                {/* =========================================================
                                    NEW FEATURE ROUTES (Supervisor Feedback)
                                ========================================================= */}
                                {/* Doctor-only: Search patients */}
                                <Route
                                    path="/patients/search"
                                    element={
                                        <PrivateRoute allowedRoles={['doctor']}>
                                            <PatientSearch />
                                        </PrivateRoute>
                                    }
                                />
                                {/* Shared: View report results (both doctor and patient can access) */}
                                <Route
                                    path="/reports/:reportId/results"
                                    element={
                                        <PrivateRoute>
                                            <ReportResults />
                                        </PrivateRoute>
                                    }
                                />

                                {/* =========================================================
                                    FALLBACK
                                ========================================================= */}
                                <Route
                                    path="*"
                                    element={
                                        <Navigate
                                            to={isDoctor ? '/' : '/patient-dashboard'}
                                            replace
                                        />
                                    }
                                />
                            </Routes>
                        </Layout>
                    </>
                ) : (
                    <Routes>
                        <Route path="/login" element={<Login />} />
                        <Route path="*" element={<Navigate to="/login" replace />} />
                    </Routes>
                )}
            </Router>
        </AppThemeProvider>
    );
}

// Axios defaults
axios.defaults.xsrfCookieName = 'csrftoken';
axios.defaults.xsrfHeaderName = 'X-CSRFToken';
axios.defaults.withCredentials = true;

export default App;