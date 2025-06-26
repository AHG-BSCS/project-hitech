import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';
import ManageStudents from './components/ManageStudents';
import { useSystemSettings } from './context/SystemSettingsContext';
import { useEffect } from 'react';

function App() {
  const { settings, loading } = useSystemSettings();
  // Helper to check authentication
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';

  useEffect(() => {
    if (settings) {
      document.title = settings.titleBar || 'School Portal';
      // Set color palette as CSS variable
      document.documentElement.style.setProperty('--primary-color', settings.colorPalette || '#2563eb');
    }
  }, [settings]);

  if (loading) {
    // Subtle blurred overlay with background color, no text
    let bgStyle = { background: settings?.bgValue || '#f3f4f6' };
    return (
      <div className="min-h-screen flex items-center relative" style={bgStyle}>
        <div className="absolute inset-0 bg-white/30 backdrop-blur-md z-0 transition-opacity duration-500"></div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route
          path="/home/*"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route path="/student_information" element={<ManageStudents />} />
        {/* Catch-all route for invalid paths */}
        <Route
          path="*"
          element={
            isAuthenticated ? <Navigate to="/home" replace /> : <Navigate to="/" replace />
          }
        />
      </Routes>
    </Router>
  );
}

export default App;