import React, { useEffect, useState, useRef } from 'react';
import { collection, getDocs, deleteDoc, doc, setDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import PERMISSIONS, { hasPermission } from '../modules/Permissions';
import RegisterUser from '../modals/RegisterUser';

function ResetPasswordModal({ open, onClose, user, onSubmit }) {
  const [generate, setGenerate] = useState(true);
  const [password, setPassword] = useState('');
  const [requireChange, setRequireChange] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setGenerate(true);
      setPassword('');
      setRequireChange(true);
      setLoading(false);
    }
  }, [open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await onSubmit({
      password: generate ? null : password,
      generate,
      requireChange,
    });
    setLoading(false);
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
      <div className="bg-white p-6 rounded shadow-md w-full max-w-md">
        <h2 className="text-lg font-bold mb-4">Reset Password for {user?.email}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={generate}
              onChange={() => setGenerate(!generate)}
            />
            <span>Generate random password</span>
          </label>
          {!generate && (
            <input
              type="text"
              className="input input-bordered w-full"
              placeholder="Enter new password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          )}
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={requireChange}
              onChange={() => setRequireChange(!requireChange)}
            />
            <span>Require user to change password on next login</span>
          </label>
          <div className="flex justify-end space-x-2">
            <button type="button" className="btn" onClick={onClose} disabled={loading}>Cancel</button>
            <button type="submit" className="btn bg-blue-600 text-white" disabled={loading}>
              {loading ? 'Processing...' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ManageUsers({ permissions }) {
  const [users, setUsers] = useState([]);
  const [searchUser, setSearchUser] = useState('');
  const [actionUserId, setActionUserId] = useState(null);
  const [dropUp, setDropUp] = useState(false);
  const buttonRefs = useRef({});
  const [showRegisterUserModal, setShowRegisterUserModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetUser, setResetUser] = useState(null);

  useEffect(() => {
    fetchUser();
  }, []);
  
  const fetchUser = async () => {
    const snapshot = await getDocs(collection(db, 'users'));
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setUsers(data);
  }; 

  const handleMakeInactive = async (uid) => {
    await setDoc(doc(db, 'users', uid), { active: false }, { merge: true });
    alert('User marked inactive');
  };

  const handleResetPassword = (user) => {
    setResetUser(user);
    setShowResetModal(true);
  };

  const handleResetPasswordSubmit = async ({ password, generate, requireChange }) => {
    // Generate a random password if needed
    let newPassword = password;
    if (generate) {
      newPassword = Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-2);
    }
    try {
      // NOTE: Only admins can set passwords via Firebase Admin SDK, not client SDK.
      // Here, we just update Firestore and show the password, but in production, this should be done server-side.
      await setDoc(doc(db, 'users', resetUser.id), {
        requirePasswordChange: requireChange,
        tempPassword: newPassword,
      }, { merge: true });
      alert(
        generate
          ? `Temporary password generated: ${newPassword}`
          : `Password set to: ${newPassword}`
      );
      setShowResetModal(false);
      setResetUser(null);
    } catch (err) {
      alert('Failed: ' + err.message);
    }
  };

  const handleDeleteUser = async (uid) => {
    if (confirm('Are you sure?')) {
      await deleteDoc(doc(db, 'users', uid));
      setUsers(prev => prev.filter(user => user.id !== uid));
      alert('User deleted');
    }
  };

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

  if (!hasPermission(permissions, PERMISSIONS.MANAGE_USERS)) {
    return (
      <Section title="Access Denied">
        <p className="text-red-500">You do not have permission to manage users.</p>
      </Section>
    );
  }

  return (
    <div>
      <Section title="Manage Users">
        <button
          onClick={() => setShowRegisterUserModal(true)}
          className="btn bg-blue-600 text-white"
        >
          Add User
        </button>
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
          <div className="h-[350px] overflow-y-auto border rounded shadow">
            <table className="table w-full text-sm text-left text-gray-700">
              <thead className="bg-gray-100 text-black sticky top-0 z-10">
                <tr>
                  <th>Employee ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users
                  .filter(user =>
                    user.employeeId?.toLowerCase().includes(searchUser.toLowerCase()) ||
                    user.email?.toLowerCase().includes(searchUser.toLowerCase())
                  )
                  .map(user => (
                    <tr
                      key={user.id}
                      className={`${
                        actionUserId === user.id
                          ? 'bg-blue-200 text-black'
                          : 'hover:bg-blue-100 hover:text-black'
                      }`}
                    >
                      <td>{user.employeeId}</td>
                      <td>{user.name}</td>
                      <td>{user.email}</td>
                      <td>{user.role} {user.active === false && (
  <span className="ml-2 px-2 py-0.5 rounded bg-gray-400 text-white text-xs">Inactive</span>
)}</td>
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
                              onClick={() => handleMakeInactive(user.id)}
                              className="block w-full px-4 py-2 text-left hover:bg-gray-100"
                            >
                              Make Inactive
                            </button>
                            <button
                              onClick={() => handleResetPassword(user)}
                              className="block w-full px-4 py-2 text-left hover:bg-gray-100"
                            >
                              Reset Password
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              className="block w-full px-4 py-2 text-left text-red-600 hover:bg-red-100"
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
      {showRegisterUserModal && (
        <RegisterUser
          open={showRegisterUserModal}
          onClose={() => setShowRegisterUserModal(false)}
          refreshUsers={fetchUser}
        />
      )}
      <ResetPasswordModal
        open={showResetModal}
        onClose={() => { setShowResetModal(false); setResetUser(null); }}
        user={resetUser}
        onSubmit={handleResetPasswordSubmit}
      />
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="bg-white p-6 rounded-lg shadow-md border border-gray-300 mb-8">
      <div className="flex justify-between items-center mb-4">
        {title && <h2 className="text-xl font-bold text-black">{title}</h2>}
        {children}
      </div>
    </section>
  );
}