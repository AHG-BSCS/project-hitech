import { useState } from 'react';

export default function Dashboard() {
  const [section, setSection] = useState('dashboard');

  const renderContent = () => {
    switch (section) {
      case 'student_info':
        return (
          <section className="bg-white p-6 rounded-lg shadow-md h-[525px]">
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
            <section className="mb-10">
              <div className="bg-white shadow-md p-6 rounded-lg">
                <h2 className="text-xl text-black font-semibold mb-4">Quick Overview</h2>
                <div className="h-px bg-gray-300 my-2 w-full"></div>
                <section className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  {['Students', 'Records', 'Classes', 'Accounts'].map((title) => (
                    <div className="stat bg-white shadow-md" key={title}>
                      <div className="stat-title text-black">{title}</div>
                      <div className="stat-value text-black">0000</div>
                    </div>
                  ))}
                </section>
              </div>
            </section>

            <section className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl text-black font-semibold mb-4">Student Population</h2>
              <div className="text-center text-gray-500 h-48 flex items-center justify-center">
                Chart
              </div>
            </section>
          </>
        );
    }
  };

  const handleLogout = () => {
    window.location.href = '/'; // or /login
  };

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-purple-700 text-white flex flex-col justify-between p-5">
        <div>
          <div className="mb-8">
            <p className="text-sm">Welcome, <span className="font-bold">Admin</span></p>
            <p className="text-xs">Administrator</p>
          </div>

          <div className="mb-10">
            <h2 className="font-bold uppercase text-sm mb-2">Dashboard</h2>
            <hr className="border-t border-gray-300 my-2" />
            <ul>
              <li className="mb-2"><button className="hover:underline" onClick={() => setSection('dashboard')}>Dashboard</button></li>
              <hr className="border-t border-gray-300 my-2" />
            </ul>
          </div>

          <div className="mb-6">
            <h2 className="font-bold uppercase text-sm mb-2">Core</h2>
            <hr className="border-t border-gray-300 my-2" />
            <select
              value={section}
              onChange={(e) => setSection(e.target.value)}
              className="select select-sm w-full max-w-xs bg-white text-black"
            >
              <option value="dashboard">Dashboard</option>
              <option value="student_info">Student Information</option>
              <option value="grade">Grade</option>
              <option value="classes">Classes</option>
              <option value="users">Users</option>
            </select>
          </div>

          <div>
            <h2 className="font-bold uppercase text-sm mb-2">Settings</h2>
            <div className="h-px bg-gray-300 my-2 w-full"></div>
            <ul>
              <li><a href="#" className="hover:underline">Portal Settings</a></li>
              <div className="h-px bg-gray-300 my-2 w-full"></div>
            </ul>
          </div>
        </div>

        <button className="btn text-white btn-error w-full mt-10" onClick={handleLogout}>LOGOUT</button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-10">
          <h1 className="text-2xl font-bold text-purple-700">Welcome to System</h1>
          <div>
            <ul>
              <li className="mb-2 text-black">LSPU ADMIN</li>
              <select className="select select-sm w-full max-w-xs bg-white text-black">
                <option disabled selected>—</option>
                <option>Account Info</option>
                <option>Records</option>
                <option>Something Something</option>
                <option>Logout</option>
              </select>
            </ul>
          </div>
        </div>

        {/* Main Section */}
        {renderContent()}
      </main>
    </div>
  );
}