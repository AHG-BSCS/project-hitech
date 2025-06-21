import React, { useState, useEffect, useRef } from 'react';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import RegisterUser from '../modals/RegisterUser';
import RegisterRole from '../modals/RegisterRole';
import { collection, getDocs, query, where } from 'firebase/firestore';
import PERMISSIONS, { hasPermission } from '../modules/Permissions';
import ClassesPage from './ClassesPage';

export default function Dashboard() {
  const navigate = useNavigate();
  const [section, setSection] = useState('dashboard');
  const [employeeId, setEmployeeId] = useState('');
  const [showRegisterUserModal, setShowRegisterUserModal] = useState(false);
  const [showRegisterRoleModal, setShowRegisterRoleModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectValue, setSelectValue] = useState('');
  const [permissions, setPermissions] = useState(0);
  const [users, setUsers] = useState([]);
  const [searchUser, setSearchUser] = useState('');
  const [roles, setRoles] = useState([]);
  const [searchSidebar, setSearchSidebar] = useState('');
  const [actionUserId, setActionUserId] = useState(null);
  const [dropUp, setDropUp] = useState(false);
  const buttonRefs = useRef({});

  useEffect(() => {
    const fetchUsers = async () => {
      const snapshot = await getDocs(collection(db, 'users'));
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(data);
    };
  
    if (section === 'users') fetchUsers();
  }, [section]);  

  useEffect(() => {
    const fetchRoles = async () => {
      const snapshot = await getDocs(collection(db, 'roles'));
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRoles(data);
    };
  
    if (section === 'roles') fetchRoles();
  }, [section]);  

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

  const fetchUsers = async () => {
    const snapshot = await getDocs(collection(db, 'users'));
    const userList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setUsers(userList);
  };

  const fetchRoles = async () => {
    const snapshot = await getDocs(collection(db, 'roles'));
    const roleList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setRoles(roleList);
  };

  const getPermissionNames = (permissionInt) => {
    if (permissionInt === 0) return 'All';
    return Object.entries(PERMISSIONS)
      .filter(([_, bit]) => (permissionInt & bit) !== 0)
      .map(([name]) => name)
      .join(', ');
  };
  
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

  const handleMakeInactive = async (uid) => {
    await setDoc(doc(db, 'users', uid), { active: false }, { merge: true });
    alert('User marked as inactive');
  };
  
  const handleResetPassword = async (email) => {
    try {
      await auth.sendPasswordResetEmail(email);
      alert('Password reset email sent');
    } catch (err) {
      alert('Failed to send reset email: ' + err.message);
    }
  };
  
  const handleDeleteUser = async (uid) => {
    if (confirm('Are you sure you want to delete this user?')) {
      await deleteDoc(doc(db, 'users', uid));
      setUsers((prev) => prev.filter((user) => user.id !== uid));
      alert('User deleted');
    }
  };  

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const toggleDropdown = (id) => {
    if (actionUserId === id) {
      setActionUserId(null);
      return;
    }
  
    const button = buttonRefs.current[id];
    if (button) {
      const rect = button.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setDropUp(spaceBelow < 120);
    }
  
    setActionUserId(id);
  };    

  const renderContent = () => {
    switch (section) {
      case 'roles':
        return hasPermission(permissions, PERMISSIONS.MANAGE_ROLES) ? (
          <div>
            <Section title="Manage Roles">
              <div>
                <button onClick={() => setShowRegisterRoleModal(true)} className="btn bg-blue-500 text-white">
                  Add Role
                </button>
              </div>
            </Section>

            <Section>
              <div className="w-full flex flex-col space-y-4">
                <input
                  type="text"
                  placeholder="Search by Role Name"
                  className="input input-bordered w-full bg-white border border-gray-300 text-black"
                  value={searchUser}
                  onChange={(e) => setSearchUser(e.target.value)}
                />

                <div className="h-[350px] overflow-y-auto border rounded shadow">
                  <table className="table w-full text-sm text-left text-gray-700">
                    <thead className="bg-gray-100 text-black sticky top-0 z-10">
                      <tr>
                        <th className="w-32">Role Name</th>
                        <th className="w-32">Permission Integer</th>
                        <th className="w-64">Permissions</th>
                        <th className="w-32">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {roles
                        .filter((role) =>
                          role.name.toLowerCase().includes(searchUser.toLowerCase())
                        )
                        .map((role) => (
                          <tr
                            key={role.id}
                            className={`${
                              actionUserId === role.id
                                ? 'bg-blue-200 text-black'
                                : 'hover:bg-blue-100 hover:text-black'
                            }`}
                          >
                            <td>{role.name}</td>
                            <td>{role.permission}</td>
                            <td>{getPermissionNames(role.permission)}</td>
                            <td className="relative">
                              <button
                                ref={(el) => (buttonRefs.current[role.id] = el)}
                                onClick={() => toggleDropdown(role.id)}
                                className="text-xl px-2 py-1 rounded"
                              >
                                ⋮
                              </button>
                              {actionUserId === role.id && (
                                <div
                                  className={`absolute ${dropUp ? 'bottom-full mb-2' : 'mt-2'} right-0 w-40 bg-white border rounded shadow-md z-10`}
                                >
                                  <button
                                    className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                                    onClick={() => alert('Edit role not implemented')}
                                  >
                                    Edit Role
                                  </button>
                                  <button
                                    className="block w-full text-left px-4 py-2 text-red-600 hover:bg-red-100"
                                    onClick={() => alert('Delete role not implemented')}
                                  >
                                    Delete Role
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </Section>
          </div>
        ) : (
          <Section title="Access Denied">
            <p className="text-red-500">You do not have permission to manage roles.</p>
          </Section>
        );
      case 'settings':
        return <Section title="Settings" />;
      case 'users':
        return hasPermission(permissions, PERMISSIONS.MANAGE_USERS) ? (
          <div>
            <Section title="Manage Users">
              <div>
                <button onClick={() => setShowRegisterUserModal(true)} className="btn bg-blue-500 text-white">Add User</button>
              </div>
            </Section>

            <Section>
              <div className="w-full flex flex-col space-y-4">
              <input
                type="text"
                placeholder="Search by ID or Email"
                className="input input-bordered w-full bg-white border border-gray-300 text-black"
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
              />

              <div className='h-[350px] overflow-y-auto border rounded shadow'>
              <table className="table w-full text-sm text-left text-gray-700">
                <thead className="bg-gray-100 text-black sticky top-0 z-10">
                  <tr>
                    <th className="w-32">Employee ID</th>
                    <th className="w-64">Email</th>
                    <th className="w-32">Role</th>
                    <th className="w-32">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users
                    .filter(user =>
                      user.employeeId.toLowerCase().includes(searchUser.toLowerCase()) ||
                      user.email.toLowerCase().includes(searchUser.toLowerCase())
                    )
                    .map((user) => (
                      <tr
                        key={user.id}
                        className={`${
                          actionUserId === user.id
                            ? 'bg-blue-200 text-black'
                            : 'hover:bg-blue-100 hover:text-black'
                        }`}
                      >
                        <td>{user.employeeId}</td>
                        <td>{user.email}</td>
                        <td>{user.role}</td>
                        <td className="relative">
                          <button
                            ref={(el) => (buttonRefs.current[user.id] = el)}
                            onClick={() => toggleDropdown(user.id)}
                            className="text-xl px-2 py-1 rounded"
                          >
                            ⋮
                          </button>
                          {actionUserId === user.id && (
                            <div
                              className={`absolute ${dropUp ? 'bottom-full mb-2' : 'mt-2'} right-0 w-40 bg-white border rounded shadow-md z-10`}
                            >
                              <button
                                className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                                onClick={() => handleMakeInactive(user.id)}
                              >
                                Make Inactive
                              </button>
                              <button
                                className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                                onClick={() => handleResetPassword(user.email)}
                              >
                                Reset Password
                              </button>
                              <button
                                className="block w-full text-left px-4 py-2 text-red-600 hover:bg-red-100"
                                onClick={() => handleDeleteUser(user.id)}
                              >
                                Delete User
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
              </div>
              </div>
            </Section>
          </div>
        ) : (
          <Section title="Access Denied">
            <p className="text-red-500">You do not have permission to manage users.</p>
          </Section>
        );
      case 'classes':
        return <ClassesPage />;
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
    ...(hasPermission(permissions, PERMISSIONS.MANAGE_STUDENTS )   ? [['student_info', 'Student Information']] : []),
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

        {showRegisterUserModal && (
          <RegisterUser open={showRegisterUserModal} onClose={() => setShowRegisterUserModal(false)} refreshUsers={fetchUsers} />
        )}
        {showRegisterRoleModal && (
          <RegisterRole open={showRegisterRoleModal} onClose={() => setShowRegisterRoleModal(false)} refreshRoles={fetchRoles} />
        )}
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