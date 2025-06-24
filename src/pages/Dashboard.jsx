import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, where } from 'firebase/firestore';
import PERMISSIONS, { hasPermission } from '../modules/Permissions';
import ManageClasses from '../components/ManageClasses';
import ManageRoles from '../components/ManageRoles';
import ManageUsers from '../components/ManageUsers';
import ManageStudents from '../components/ManageStudents';

// A placeholder for a generic section component.
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

// The main Dashboard component
export default function Dashboard() {
  const navigate = useNavigate();
  const [section, setSection] = useState('dashboard');
  const [employeeId, setEmployeeId] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectValue, setSelectValue] = useState('');
  const [permissions, setPermissions] = useState(0);
  const [searchSidebar, setSearchSidebar] = useState('');

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        navigate('/login');
      } else {
        const q = query(collection(db, 'users'), where('uid', '==', user.uid));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const userData = querySnapshot.docs[0].data();
          setEmployeeId(userData.employeeId);
          localStorage.setItem('employeeId', userData.employeeId);
          setPermissions(userData.permissions || 0);
        }
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await signOut(auth);
    localStorage.removeItem('employeeId');
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

  const renderContent = () => {
    switch (section) {
      case 'roles':
        return <ManageRoles permissions={permissions} />;
      case 'settings':
        return <GenericSection title="Settings" />;
      case 'users':
        return <ManageUsers permissions={permissions} />;
      case 'classes':
        return <ManageClasses />;
      case 'grade':
        return <GenericSection title="Manage Grades" />;
      case 'student_info':
        return <ManageStudents permissions={permissions} />;
      case 'dashboard':
      default:
        return (
          <>
            <Section title="Quick Overview">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {['Students', 'Records', 'Classes', 'Accounts'].map((title) => (
                  <div key={title} className="stat bg-white border border-gray-300 shadow-md">
                    <div className="stat-title text-black">{title}</div>
                    <div className="stat-value text-black">0000</div>
                  </div>
                ))}
              </div>
            </Section>
            <Section title="Student Population">
              <div className="text-center text-gray-500 h-48 flex items-center justify-center">
                Chart
              </div>
            </Section>
          </>
        );
    }
  };

  const menuItems = [
    ['dashboard', 'Dashboard'],
    ...(hasPermission(permissions, PERMISSIONS.MANAGE_STUDENTS) ? [['student_info', 'Student Information']] : []),
    ...(hasPermission(permissions, PERMISSIONS.MANAGE_GRADES) ? [['grade', 'Grade']] : []),
    ...(hasPermission(permissions, PERMISSIONS.MANAGE_CLASSES) ? [['classes', 'Classes']] : []),
    ...(hasPermission(permissions, PERMISSIONS.MANAGE_USERS) ? [['users', 'Users']] : []),
    ...(hasPermission(permissions, PERMISSIONS.MANAGE_ROLES) ? [['roles', 'Roles']] : []),
    ...(hasPermission(permissions, PERMISSIONS.MANAGE_SETTINGS) ? [['settings', 'Settings']] : []),
  ];

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full bg-blue-900 text-white w-64 transition-transform duration-300 ease-in-out z-40 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:relative md:flex-shrink-0`}>
        <div className="flex flex-col h-full p-5">
          {/* Profile */}
          <div className="bg-white text-black text-center rounded-lg py-5 mb-8 flex-shrink-0">
            <img src="/placeholder.svg" alt="Profile" className="w-10 h-10 mx-auto mb-3" />
            <p className="text-sm">
              Welcome, <span className="font-bold">{employeeId || 'Loading...'}</span>
            </p>
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
                      setSection(key);
                      setSidebarOpen(false);
                    }}
                    className={`w-full flex items-center text-black text-left py-2 px-2 rounded-lg hover:bg-blue-100 ${section === key ? 'bg-blue-100 font-bold' : ''}`}
                  >
                    <img src="/placeholder.svg" alt="" className="w-7 h-7 mr-2" />
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
            <h1 className="text-2xl font-bold text-black">Welcome to System</h1>
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
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

// Section Component
function Section({ title, children }) {
  return (
    <section className="bg-white p-6 rounded-lg shadow-md border border-gray-300 mb-8">
      <h2 className="text-xl font-bold text-black mb-4">{title}</h2>
      <div>
        {children}
      </div>
    </section>
  );
}