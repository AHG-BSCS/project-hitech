import React, { useState } from 'react';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const navigate = useNavigate();
  const [section, setSection] = useState('dashboard');
  const [employeeId, setEmployeeId] = useState('');

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        navigate('/login');
      }
    });

    const storedId = localStorage.getItem('employeeId');
    if (storedId) {
      setEmployeeId(storedId);
    }
    return () => unsubscribe();
  }, []);

  const renderContent = () => {
    switch (section) {
      case 'settings':
        return (
          <section className="bg-white p-6 rounded-lg shadow-md border border-gray-300 h-[525px]">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-black">Settings</h2>
            </div>
          </section>
        );
      case 'users':
        return (
          <section className="bg-white p-6 rounded-lg shadow-md border border-gray-300 h-[525px]">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-black">Manage Users</h2>
              <button className="w-full flex text-black text-left py-2 rounded-lg" onClick={() => navigate('/register')}>
                Add User
              </button>
            </div>
          </section>
        );
      case 'classes':
        return (
          <section className="bg-white p-6 rounded-lg shadow-md border border-gray-300 h-[525px]">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-black">Manage Classes</h2>
            </div>
          </section>
        );
      case 'grade':
        return (
          <section className="bg-white p-6 rounded-lg shadow-md border border-gray-300 h-[525px]">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-black">Manage Grades</h2>
            </div>
          </section>
        );
      case 'student_info':
        return (
          <section className="bg-white p-6 rounded-lg shadow-md border border-gray-300 h-[525px]">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-black">Manage Student Information</h2>
              <button className="btn bg-purple-700 text-white hover:bg-purple-800">Create</button>
            </div>
            <div className="flex items-center mb-4 gap-2">
              <span className="text-sm text-black">Show</span>
              <select className="select select-sm max-w-xs bg-white text-black">
                {[10, 20, 30, 40, 50].map((num) => (
                  <option key={num}>{num}</option>
                ))}
              </select>
              <span className="text-sm text-black">Entries</span>
            </div>
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead className="bg-pink-200 text-black">
                  <tr>
                    <th>LRN</th>
                    <th>Last Name</th>
                    <th>First Name</th>
                    <th>Gender</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody className="bg-pink-100 text-black">
                  {[1, 2, 3].map((_, i) => (
                    <tr key={i}>
                      <td>1234567890</td>
                      <td>Dela Cruz</td>
                      <td>Juan</td>
                      <td>Male</td>
                      <td>
                        <div className="dropdown dropdown-bottom">
                          <label tabIndex={0} className="btn btn-xs">Actions</label>
                          <ul tabIndex={0} className="dropdown-content bg-white menu shadow bg-base-100 rounded-box w-28 z-50">
                            <li><a href="#">View</a></li>
                            <li><a href="#">Edit</a></li>
                            <li><a href="#">Delete</a></li>
                          </ul>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );

      case 'dashboard':
      default:
        return (
          <>
            <section className="mb-10 shadow-lg">
              <div className="bg-white shadow-md border border-gray-300 p-6 rounded-lg">
                <h2 className="text-xl text-black font-semibold mb-4">Quick Overview</h2>
                <div className="h-px bg-gray-300 my-2 w-full"></div>
                <section className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  {['Students', 'Records', 'Classes', 'Accounts'].map((title) => (
                    <div className="stat bg-white border border-gray-300 shadow-md" key={title}>
                      <div className="stat-title text-black">{title}</div>
                      <div className="stat-value text-black">0000</div>
                    </div>
                  ))}
                </section>
              </div>
            </section>

            <section className="bg-white shadow-md border border-gray-300 p-6 rounded-lg shadow-md">
              <h2 className="text-xl text-black font-semibold mb-4">Student Population</h2>
              <div className="text-center text-gray-500 h-48 flex items-center justify-center">
                Chart
              </div>
            </section>
          </>
        );
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    localStorage.removeItem('employeeId');
    localStorage.removeItem('isAuthenticated');
    window.location.href = '/';
  };

  return (
    <div>
      <div className="bg-blue-900 flex min-h-screen">
        <aside className="fixed top-5 left-5 bottom-5 text-white center flex flex-col">
          <div>
            <div className="mb-8 bg-white text-black text-center rounded-lg py-5">
              <p className="text-sm">
                Welcome, <span className="font-bold">{employeeId || 'User'}</span>
              </p>
            </div>

            <div className="mb-8 bg-white text-black text-center rounded-lg py-4 px-4 h-[calc(100%-0.5rem)]">
              <div className="mb-6">
                <input
                  type="text"
                  placeholder="Search"
                  className="w-full p-2 rounded-lg border border-blue-900 text-black bg-transparent"
                />
              </div>
              <div className='items-center mb-4'>
                <button className="w-full flex text-black text-left py-2 rounded-lg" onClick={() => setSection('dashboard')}>
                  <img src="../public/placeholder.svg" alt="Dashboard Icon" className="w-7 h-7 mr-2" />
                  Dashboard
                </button>
                <button className="w-full flex text-black text-left py-2 rounded-lg" onClick={() => setSection('student_info')}>
                  <img src="../public/placeholder.svg" alt="Dashboard Icon" className="w-7 h-7 mr-2" />
                  Student Information
                </button>
                <button className="w-full flex text-black text-left py-2 rounded-lg" onClick={() => setSection('grade')}>
                  <img src="../public/placeholder.svg" alt="Dashboard Icon" className="w-7 h-7 mr-2" />
                  Grade
                </button>
                <button className="w-full flex text-black text-left py-2 rounded-lg" onClick={() => setSection('classes')}>
                  <img src="../public/placeholder.svg" alt="Dashboard Icon" className="w-7 h-7 mr-2" />
                  Classes
                </button>
                <button className="w-full flex text-black text-left py-2 rounded-lg" onClick={() => setSection('users')}>
                  <img src="../public/placeholder.svg" alt="Dashboard Icon" className="w-7 h-7 mr-2" />
                  Users
                </button>
                <button className="w-full flex text-black text-left py-2 rounded-lg" onClick={() => setSection('settings')}>
                  <img src="../public/placeholder.svg" alt="Dashboard Icon" className="w-7 h-7 mr-2" />
                  Settings
                </button>
              </div>
            </div>
          </div>

          <div className="mt-auto">
            <button className="btn text-white btn-error w-full" onClick={handleLogout}>
              LOGOUT
            </button>
          </div>
        </aside>

        <div className='ml-64 w-full flex flex-col justify-between bg-white rounded-lg p-5 m-5'>
        <div>
          <div className="flex justify-between items-center bg-white">
            <h1 className="text-2xl font-bold text-black">Welcome to System</h1>
            <ul>
            <li className="text-sm">
              <span className='text-black'>{employeeId || 'User'}</span>
            </li>
              <select className="select select-sm w-full max-w-xs bg-white shadow-md border border-gray-300 text-black">
                <option disabled selected>—</option>
                <option>Account Info</option>
                <option>Records</option>
                <option>Something Something</option>
                <option>Logout</option>
              </select>
            </ul>
          </div>
        </div>
        <div className="flex-1 p-8">
          {renderContent()}
        </div>
      </div>
      </div>
    );
    </div>
  );
}