import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import PERMISSIONS, { hasPermission } from '../modules/Permissions';
import ManageClasses from '../components/ManageClasses';
import ManageRoles from '../components/ManageRoles';
import ManageUsers from '../components/ManageUsers';
import ManageStudents from '../components/ManageStudents';
import Home from '../components/Home';
import PortalSettings from '../components/PortalSettings';
import ManageSubjects from '../components/ManageSubjects';
import ManageGrades from '../components/ManageGrades';
import ViewClasses from '../components/ViewClasses';
import { useSystemSettings } from '../context/SystemSettingsContext';
import { usePermissions } from '../context/PermissionsContext';
import { FaHome, FaUserGraduate, FaChalkboardTeacher, FaUsers, FaUserShield, FaCogs, FaCog, FaSchool } from 'react-icons/fa';

// The main Dashboard component
export default function Dashboard() {
  const navigate = useNavigate();
  const [section] = useState('dashboard');
  const [employeeId, setEmployeeId] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectValue, setSelectValue] = useState('');
  const [searchSidebar, setSearchSidebar] = useState('');
  const [showLockedModal, setShowLockedModal] = useState(false);
  const { settings } = useSystemSettings();
  const { permissions, userRole, loading } = usePermissions();

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        navigate('/');
        return;
      }
  
      const q = query(collection(db, 'users'), where('uid', '==', user.uid));
      const unsubscribeUser = onSnapshot(q, (querySnapshot) => {
        if (!querySnapshot.empty) {
          const userData = querySnapshot.docs[0].data();
  
          if (userData.isLocked) {
            setShowLockedModal(true);
            signOut(auth);
            localStorage.removeItem('employeeId');
            localStorage.removeItem('userId');
            localStorage.removeItem('isAuthenticated');
            return;
          }
  
          setEmployeeId(userData.employeeId);
          localStorage.setItem('employeeId', userData.employeeId);
          localStorage.setItem('userId', auth.currentUser.uid);
        }
      });
  
      return () => {
        unsubscribeUser();
      };
    });
  
    return () => {
      unsubscribeAuth();
    };
  }, [navigate]);

  const handleLogout = async () => {
    await signOut(auth);
    localStorage.removeItem('employeeId');
    localStorage.removeItem('userId');
    localStorage.removeItem('isAuthenticated');
    window.location.href = '/';
  };

  const handleSelectChange = (e) => {
    const value = e.target.value;
    setSelectValue(value);
    if (value === 'logout') {
      handleLogout();
    }
  };

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const menuItems = [
    ['home', 'Home'],
    // Show if MANAGE or VIEW permission is present
    ...(hasPermission(permissions, PERMISSIONS.MANAGE_STUDENTS) || hasPermission(permissions, PERMISSIONS.VIEW_STUDENTS)
      ? [['student_info', 'Student Information']] : []),
    ...(hasPermission(permissions, PERMISSIONS.MANAGE_GRADES) || hasPermission(permissions, PERMISSIONS.ENCODE_GRADES)
      ? [['grade', 'Grade']] : []),
    ...(hasPermission(permissions, PERMISSIONS.MANAGE_CLASSES) || hasPermission(permissions, PERMISSIONS.VIEW_CLASSES)
      ? [['classes', 'Classes']] : []),
    ...(hasPermission(permissions, PERMISSIONS.MANAGE_SUBJECTS) || hasPermission(permissions, PERMISSIONS.VIEW_SUBJECTS)
      ? [['subjects', 'Subjects']] : []),
    ...(hasPermission(permissions, PERMISSIONS.MANAGE_USERS) || hasPermission(permissions, PERMISSIONS.VIEW_USERS)
      ? [['users', 'Users']] : []),
    ...(hasPermission(permissions, PERMISSIONS.MANAGE_ROLES)
      ? [['roles', 'Roles']] : []),
    ...(hasPermission(permissions, PERMISSIONS.MANAGE_SETTINGS)
      ? [['settings', 'Settings']] : []),
    ...(hasPermission(permissions, PERMISSIONS.PORTAL_SETTINGS)
      ? [['portal_settings', 'Portal Settings']] : []),
  ];

  // Map menu keys to icons
  const menuIcons = {
    home: <FaHome className="w-7 h-7 mr-2" />,
    student_info: <FaUserGraduate className="w-7 h-7 mr-2" />,
    grade: <FaChalkboardTeacher className="w-7 h-7 mr-2" />,
    classes: <FaChalkboardTeacher className="w-7 h-7 mr-2" />,
    subjects: <FaChalkboardTeacher className="w-7 h-7 mr-2" />,
    users: <FaUsers className="w-7 h-7 mr-2" />,
    roles: <FaUserShield className="w-7 h-7 mr-2" />,
    settings: <FaCogs className="w-7 h-7 mr-2" />,
    portal_settings: <FaSchool className="w-7 h-7 mr-2" />,
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-100">
        {/* Sidebar placeholder */}
        <aside className="fixed top-0 left-0 h-full bg-blue-900 text-white w-64 md:relative md:flex-shrink-0 animate-pulse" style={{ background: settings?.colorPalette || '#2563eb' }}>
          <div className="flex flex-col h-full p-5 items-center justify-center">
            <div className="flex flex-col items-center">
              <svg className="animate-spin h-8 w-8 text-white mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
              </svg>
              <span className="text-xs text-white opacity-80">Loading system settings...</span>
            </div>
          </div>
        </aside>
        {/* Main Content placeholder */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="flex justify-between items-center p-5 bg-white border-b border-gray-200 flex-wrap gap-4 flex-shrink-0 min-h-[64px] animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
            <div className="h-6 bg-gray-200 rounded w-24"></div>
          </header>
          <main className="p-5 flex-1 overflow-y-auto">
            <div className="h-48 bg-white rounded-lg shadow-md border border-gray-200 flex items-center justify-center animate-pulse">
              <span className="text-gray-400">Preparing dashboard...</span>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Helper to check permission for a route
  const requirePermission = (perm) => hasPermission(permissions, perm);

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-30 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside className={`fixed top-0 left-0 h-full bg-blue-900 text-white w-64 transition-transform duration-300 ease-in-out z-40 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:relative md:flex-shrink-0`} style={{ background: settings?.colorPalette || '#2563eb' }}>
        <div className="flex flex-col h-full p-5">
          {/* Profile */}
          <div className="bg-white text-black text-center rounded-lg py-5 mb-8 flex-shrink-0">
            <div className="flex items-center justify-center w-full" style={{ minHeight: '60px' }}>
              {settings?.logoBase64 ? (
                <img
                  src={settings.logoBase64}
                  alt="Profile"
                  style={{ maxWidth: '100%', maxHeight: '60px', objectFit: 'contain', display: 'block' }}
                  className="mx-auto mb-3"
                />
              ) : (
                <img
                  src="/placeholder.svg"
                  alt="Profile"
                  style={{ maxWidth: '100%', maxHeight: '60px', objectFit: 'contain', display: 'block' }}
                  className="mx-auto mb-3"
                />
              )}
            </div>
            <p className="text-sm">
              Welcome, <span className="font-bold">{employeeId || 'Loading...'}</span>
            </p>
            {settings?.schoolId && <p className="text-xs text-gray-500">School ID: {settings.schoolId}</p>}
          </div>

          <div className="flex-1 flex flex-col bg-white text-black rounded-lg p-4 mb-4 min-h-0">
            <div className="flex-shrink-0">
              <input
                type="text"
                placeholder="Search"
                className="w-full p-2 mb-4 rounded-lg border border-blue-900 text-black bg-transparent sticky top-0 z-10"
                value={searchSidebar}
                onChange={(e) => setSearchSidebar(e.target.value)}
              />
            </div>
            <div className="overflow-y-auto">
              {menuItems
                .filter(([_, label]) =>
                  label.toLowerCase().includes(searchSidebar.toLowerCase())
                )
                .map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => {
                      const path = key === 'home' ? '/home' : '/' + key;
                      navigate(path);
                      setSidebarOpen(false);
                    }}
                    className={`w-full flex items-center text-black text-left py-2 px-2 rounded-lg hover:bg-blue-100 ${section === key ? 'bg-blue-100 font-bold' : ''}`}
                  >
                    {menuIcons[key] || <FaCog className="w-7 h-7 mr-2" />} {/* Use icon or fallback */}
                    {label}
                  </button>
                ))}
            </div>
          </div>
          <button className="btn btn-error text-white w-full flex-shrink-0" onClick={handleLogout}>
            LOGOUT
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex justify-between items-center p-5 bg-white border-b border-gray-200 flex-wrap gap-4 flex-shrink-0">
          <div className="flex items-center">
             <button
                className="md:hidden text-black bg-gray-200 p-2 rounded mr-4"
                onClick={toggleSidebar}
              >
                ☰
              </button>
            <h1 className="text-2xl font-bold text-black">{settings?.titleBar || 'Welcome to System'}</h1>
          </div>
          <div className="flex items-center">
            <span className="text-black text-sm mr-2 hidden sm:inline">{employeeId || 'User'}</span>
            <select
              value={selectValue}
              onChange={handleSelectChange}
              className="select select-sm bg-white border border-gray-300 text-black"
            >
              <option value="" disabled>—</option>
              <option value="account">Account Info</option>
              <option value="records">Records</option>
              <option value="misc">Something Something</option>
              <option value="logout">Logout</option>
            </select>
          </div>
        </header>

        {/* Section Content */}
        <main className="p-5 flex-1 overflow-y-auto">
          <Routes>
            <Route path="home" element={<Home />} />
            <Route path="student_info" element={
              hasPermission(permissions, PERMISSIONS.MANAGE_STUDENTS) || hasPermission(permissions, PERMISSIONS.VIEW_STUDENTS)
                ? <ManageStudents />
                : <NotAuthorized />
            } />
            <Route path="users" element={
              hasPermission(permissions, PERMISSIONS.MANAGE_USERS) || hasPermission(permissions, PERMISSIONS.VIEW_USERS)
                ? <ManageUsers />
                : <NotAuthorized />
            } />
            <Route path="roles" element={requirePermission(PERMISSIONS.MANAGE_ROLES) ? <ManageRoles permissions={permissions} /> : <NotAuthorized />} />
            <Route path="classes" element={
              hasPermission(permissions, PERMISSIONS.MANAGE_CLASSES) || hasPermission(permissions, PERMISSIONS.VIEW_CLASSES) ? (
                <>
                  {hasPermission(permissions, PERMISSIONS.MANAGE_CLASSES) && (
                    <ManageClasses />
                  )}
                  {hasPermission(permissions, PERMISSIONS.VIEW_CLASSES) && (
                    <ViewClasses employeeId={employeeId} />
                  )}
                </>
              ) : <NotAuthorized />
            } />
            <Route path="grade" element={
              hasPermission(permissions, PERMISSIONS.MANAGE_GRADES) || hasPermission(permissions, PERMISSIONS.ENCODE_GRADES)
                ? <ManageGrades />
                : <NotAuthorized />
            } />
            <Route path="settings" element={requirePermission(PERMISSIONS.MANAGE_SETTINGS) ? <GenericSection title="Manage Settings" /> : <NotAuthorized />} />
            <Route path="portal_settings" element={requirePermission(PERMISSIONS.PORTAL_SETTINGS) ? <PortalSettings /> : <NotAuthorized />} />
            <Route path="subjects" element={
              hasPermission(permissions, PERMISSIONS.MANAGE_SUBJECTS) || hasPermission(permissions, PERMISSIONS.VIEW_SUBJECTS)
                ? <ManageSubjects />
                : <NotAuthorized />
            } />
            <Route path="*" element={<GenericSection title="Not Found" />} />
          </Routes>
        </main>
      </div>

      <LockedModal open={showLockedModal} onClose={() => setShowLockedModal(false)} />
    </div>
  );
}

function GenericSection({ title }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-300">
      <h2 className="text-xl font-bold text-black mb-4">{title}</h2>
      <div className="text-center text-gray-500 h-48 flex items-center justify-center">
        Content for {title} goes here.
      </div>
    </div>
  );
}

function NotAuthorized() {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-red-300">
      <h2 className="text-xl font-bold text-red-600 mb-4">Not Authorized</h2>
      <div className="text-center text-gray-500 h-48 flex items-center justify-center">
        You are not authorized to view this page.
      </div>
    </div>
  );
}

function LockedModal({ open, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
      <div className="bg-white p-6 rounded shadow-md w-full max-w-md">
        <h2 className="text-lg font-bold mb-4 text-red-600">Account Locked</h2>
        <p className="mb-4">Your account has been locked. Please contact your administrator for more information.</p>
        <div className="flex justify-end">
          <button type="button" className="btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}