import React, { useState, useEffect, useRef } from 'react';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, where } from 'firebase/firestore';
import PERMISSIONS, { hasPermission } from '../modules/Permissions';
import ManageClasses from '../components/ManageClasses';
import ManageRoles from '../components/ManageRoles';
import ManageUsers from '../components/ManageUsers';

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
    if (value === 'logout') handleLogout();
  };

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);  

  const renderContent = () => {
    switch (section) {
      case 'roles':
        return (
          <ManageRoles
            permissions={permissions}
          />
        );
      case 'settings':
        return <Section title="Settings" />;
      case 'users':
        return (
          <ManageUsers
            permissions={permissions}
          />
        );
      case 'classes':
        return <ManageClasses />;
      case 'grade':
        return <Section title="Manage Grades" />;
      case 'student_info':
        return (
          <Section title="Manage Student Information">
            <button className="btn bg-purple-700 text-white hover:bg-purple-800">Create</button>
          </Section>
        );
      case 'dashboard':
      default:
        return (
          <>
            <Section title="Quick Overview">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {['Students', 'Records', 'Classes', 'Accounts'].map((title) => (
                  <div key={title} className="stat bg-white border border-gray-300 shadow-md">
                    <div className="stat-title text-black">{title}</div>
                    <div className="stat-value text-black">0000</div>
                  </div>
                ))}
              </div>
            </Section>
            <Section title="Student Population">
              <div className="text-center text-gray-500 h-48 flex items-center justify-center">Chart</div>
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
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full bg-blue-900 text-white w-64 transition-transform duration-300 z-40 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        <div className="flex flex-col h-full p-5">
          {/* Profile */}
          <div className="bg-white text-black text-center rounded-lg py-5 mb-8">
            <img src="../public/placeholder.svg" alt="Profile" className="w-10 h-10 mx-auto mb-3" />
            <p className="text-sm">
              Welcome, <span className="font-bold">
                {employeeId ? employeeId : 'Loading...'}
              </span>
            </p>
          </div>

          {/* Menu */}
          <div className="flex-1 bg-white text-black rounded-lg px-4 py-4 mb-8 max-h-[500]">
            <div>
              <input
                type="text"
                placeholder="Search"
                className="w-full p-2 mb-6 rounded-lg border border-blue-900 text-black bg-transparent sticky top-0 z-10"
                value={searchSidebar}
                onChange={(e) => setSearchSidebar(e.target.value)}
              />
            </div>
            <div className="max-h-[375px] overflow-y-auto">
              {menuItems
                .filter(([_, label]) =>
                  label.toLowerCase().includes(searchSidebar.toLowerCase())
                )
                .map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setSection(key)}
                    className="w-full flex items-center text-black text-left py-2 rounded-lg hover:bg-blue-100"
                  >
                    <img src="../public/placeholder.svg" alt={`${label} Icon`} className="w-7 h-7 mr-2" />
                    {label}
                  </button>
                ))}
            </div>
          </div>

          <button className="btn btn-error text-white w-full mt-auto" onClick={handleLogout}>
            LOGOUT
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 ml-0 md:ml-64 bg-white p-5">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <button
            className="md:hidden text-black bg-gray-200 p-2 rounded"
            onClick={toggleSidebar}
          >
            ☰
          </button>
          <h1 className="text-2xl font-bold text-black">Welcome to System</h1>
          <div>
            <span className="text-black text-sm mr-2">{employeeId || 'User'}</span>
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
        </div>

        {/* Section Content */}
        <div className="p-2">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="bg-white p-6 rounded-lg shadow-md border border-gray-300 mb-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-black">{title}</h2>
        {children}
      </div>
    </section>
  );
}