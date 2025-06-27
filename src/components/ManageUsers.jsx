import React, { useEffect, useState, useRef } from 'react';
import { collection, getDocs, deleteDoc, doc, setDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import PERMISSIONS, { hasPermission } from '../modules/Permissions';
import RegisterUser from '../modals/RegisterUser';

function ResetPasswordModal({ open, onClose, user }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setLoading(false);
      setMessage('');
      setError('');
    }
  }, [open]);

  const handleSendReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');
    try {
      await sendPasswordResetEmail(auth, user.email);
      setMessage('Password reset email sent successfully.');
    } catch (err) {
      setError('Failed to send reset email: ' + err.message);
    }
    setLoading(false);
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
      <div className="bg-white p-6 rounded shadow-md w-full max-w-md">
        <h2 className="text-lg font-bold mb-4">Send Password Reset Email</h2>
        <p className="mb-4">Send a password reset link to <span className="font-semibold">{user?.email}</span>?</p>
        {message && <div className="text-green-600 mb-2">{message}</div>}
        {error && <div className="text-red-600 mb-2">{error}</div>}
        <div className="flex justify-end space-x-2">
          <button type="button" className="btn" onClick={onClose} disabled={loading}>Cancel</button>
          <button type="button" className="btn bg-blue-600 text-white" onClick={handleSendReset} disabled={loading || message}>
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </div>
      </div>
    </div>
  );
}

function LockUserModal({ open, onClose, onConfirm, user }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
      <div className="bg-white p-6 rounded shadow-md w-full max-w-md">
        <h2 className="text-lg font-bold mb-4">Lock User</h2>
        <p className="mb-4">Are you sure you want to <span className="font-semibold">lock</span> the account for <span className="font-semibold">{user?.email}</span>?</p>
        <div className="flex justify-end space-x-2">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="button" className="btn bg-yellow-600 text-white" onClick={onConfirm}>Lock User</button>
        </div>
      </div>
    </div>
  );
}

function UnlockUserModal({ open, onClose, onConfirm, user }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
      <div className="bg-white p-6 rounded shadow-md w-full max-w-md">
        <h2 className="text-lg font-bold mb-4">Unlock User</h2>
        <p className="mb-4">Are you sure you want to <span className="font-semibold">unlock</span> the account for <span className="font-semibold">{user?.email}</span>?</p>
        <div className="flex justify-end space-x-2">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="button" className="btn bg-green-600 text-white" onClick={onConfirm}>Unlock User</button>
        </div>
      </div>
    </div>
  );
}

function SuccessModal({ open, onClose, message }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
      <div className="bg-white p-6 rounded shadow-md w-full max-w-md">
        <h2 className="text-lg font-bold mb-4">Success</h2>
        <p className="mb-4">{message}</p>
        <div className="flex justify-end">
          <button type="button" className="btn bg-blue-600 text-white" onClick={onClose}>OK</button>
        </div>
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
  const [showLockModal, setShowLockModal] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [lockUser, setLockUser] = useState(null);
  const [unlockUser, setUnlockUser] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

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
    setSuccessMessage('User marked inactive');
    setShowSuccessModal(true);
  };

  const handleResetPassword = (user) => {
    setResetUser(user);
    setShowResetModal(true);
  };

  const handleDeleteUser = async (uid) => {
    if (confirm('Are you sure?')) {
      await deleteDoc(doc(db, 'users', uid));
      setUsers(prev => prev.filter(user => user.id !== uid));
      setSuccessMessage('User deleted');
      setShowSuccessModal(true);
    }
  };

  const handleLockUser = async (uid) => {
    const user = users.find(u => u.id === uid);
    setLockUser(user);
    setShowLockModal(true);
  };

  const handleUnlockUser = async (uid) => {
    const user = users.find(u => u.id === uid);
    setUnlockUser(user);
    setShowUnlockModal(true);
  };

  const confirmLockUser = async () => {
    if (!lockUser) return;
    await setDoc(doc(db, 'users', lockUser.id), { isLocked: true }, { merge: true });
    setShowLockModal(false);
    setLockUser(null);
    setSuccessMessage('User locked');
    setShowSuccessModal(true);
    fetchUser();
  };

  const confirmUnlockUser = async () => {
    if (!unlockUser) return;
    await setDoc(doc(db, 'users', unlockUser.id), { isLocked: false }, { merge: true });
    setShowUnlockModal(false);
    setUnlockUser(null);
    setSuccessMessage('User unlocked');
    setShowSuccessModal(true);
    fetchUser();
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
)} {user.isLocked && (
  <span className="ml-2 px-2 py-0.5 rounded bg-yellow-500 text-white text-xs">Locked</span>
)}
                      </td>
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
                            {user.isLocked ? (
                              <button
                                onClick={() => handleUnlockUser(user.id)}
                                className="block w-full px-4 py-2 text-left hover:bg-green-100"
                              >
                                Unlock User
                              </button>
                            ) : (
                              <button
                                onClick={() => handleLockUser(user.id)}
                                className="block w-full px-4 py-2 text-left hover:bg-yellow-100"
                              >
                                Lock User
                              </button>
                            )}
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
      />
      <LockUserModal
        open={showLockModal}
        onClose={() => { setShowLockModal(false); setLockUser(null); }}
        onConfirm={confirmLockUser}
        user={lockUser}
      />
      <UnlockUserModal
        open={showUnlockModal}
        onClose={() => { setShowUnlockModal(false); setUnlockUser(null); }}
        onConfirm={confirmUnlockUser}
        user={unlockUser}
      />
      <SuccessModal
        open={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        message={successMessage}
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