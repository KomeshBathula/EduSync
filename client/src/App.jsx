import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/auth/Login';
import Founders from './pages/auth/Founders';
import StudentLogin from './pages/auth/StudentLogin';
import TeacherLogin from './pages/auth/TeacherLogin';
import AdminLogin from './pages/auth/AdminLogin';
import StudentDashboard from './pages/student/StudentDashboard';
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import AdminDashboard from './pages/admin/AdminDashboard';
import QuizAttempt from './pages/student/QuizAttempt';
import QuizReview from './pages/student/QuizReview';
import AIDoubtSolver from './pages/student/AIDoubtSolver';
import SmartRevision from './pages/student/SmartRevision';
import ProtectedRoute from './components/common/ProtectedRoute';
import { ThemeProvider } from './contexts/ThemeContext';

function App() {
  return (
    <ThemeProvider>
      <Router>
        <div className="min-h-screen bg-background text-text-primary font-body antialiased transition-colors duration-300">
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/founders" element={<Founders />} />
            <Route path="/login/student" element={<StudentLogin />} />
            <Route path="/login/teacher" element={<TeacherLogin />} />
            <Route path="/login/admin" element={<AdminLogin />} />
            <Route
              path="/student/dashboard"
              element={(
                <ProtectedRoute allowedRoles={['STUDENT']}>
                  <StudentDashboard />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/student/quiz/:id"
              element={(
                <ProtectedRoute allowedRoles={['STUDENT']}>
                  <QuizAttempt />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/student/quiz/:id/review"
              element={(
                <ProtectedRoute allowedRoles={['STUDENT']}>
                  <QuizReview />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/student/doubt-solver"
              element={(
                <ProtectedRoute allowedRoles={['STUDENT']}>
                  <AIDoubtSolver />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/student/smart-revision"
              element={(
                <ProtectedRoute allowedRoles={['STUDENT']}>
                  <SmartRevision />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/teacher/dashboard"
              element={(
                <ProtectedRoute allowedRoles={['TEACHER']}>
                  <TeacherDashboard />
                </ProtectedRoute>
              )}
            />
            <Route
              path="/admin/dashboard"
              element={(
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <AdminDashboard />
                </ProtectedRoute>
              )}
            />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;
