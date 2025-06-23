import React, { useState, useEffect } from 'react';
import { db, temp } from '../firebase';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signOut as secondarySignOut,
} from 'firebase/auth';
import {
  collection,
  setDoc,
  doc,
  getDocs,
} from 'firebase/firestore';

export default function RegisterUser({ open, onClose, refreshUsers }) {
  const [form, setForm] = useState({
    email: '',
    employeeId: '',
    role: '',
  });
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!open) return;

    const fetchRoles = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'roles'));
        const rolesList = snapshot.docs
          .map(doc => ({
            id: doc.id,
            name: doc.data().name,
            permission: doc.data().permission,
          }))
          .filter(role => role.name && typeof role.permission === 'number')
          .sort((a, b) => a.name.localeCompare(b.name));

        setRoles(rolesList);
      } catch (err) {
        console.error('Failed to fetch roles:', err);
      }
    };

    fetchRoles();
  }, [open]);

  if (!open) return null;

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const { email, employeeId, role } = {
      email: form.email.trim(),
      employeeId: form.employeeId.trim(),
      role: form.role,
    };
    const password = 'hitech123';

    try {
      const roleObj = roles.find(r => r.name === role);
      if (!roleObj) throw new Error('Selected role is invalid');

      const secondaryAuth = getAuth(temp);
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
      const newUser = userCredential.user;

      await setDoc(doc(db, 'users', newUser.uid), {
        uid: newUser.uid,
        email,
        employeeId,
        role: roleObj.name,
        permissions: roleObj.permission,
        active: true,
      });

      await secondarySignOut(secondaryAuth);

      setMessage('✅ User registered successfully!');
      setForm({ email: '', employeeId: '', role: '' });

      if (typeof refreshUsers === 'function') {
        refreshUsers();
      }
    } catch (err) {
      console.error('Registration failed:', err);
      setMessage(`❌ ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center z-50">
      {/* Prevent outside click from closing the modal */}
      <div className="bg-white rounded-lg shadow-md p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-black mb-4 text-center">Register New User</h2>
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1">Employee ID</label>
            <input
              name="employeeId"
              placeholder="Employee ID"
              className="input input-bordered w-full bg-white border border-gray-300 text-black"
              value={form.employeeId}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1">Email</label>
            <input
              name="email"
              type="email"
              placeholder="Email"
              className="input input-bordered w-full bg-white border border-gray-300 text-black"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1">Select Role</label>
            <select
              name="role"
              className="select select-bordered w-full bg-white text-black"
              value={form.role}
              onChange={handleChange}
              required
            >
              <option value="" disabled>Select Role</option>
              {roles.map((r) => (
                <option key={r.id} value={r.name}>
                  {r.name.charAt(0).toUpperCase() + r.name.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <p className="text-xs text-gray-500">Default password is <code>hitech123</code></p>

          {message && (
            <p
              className={`text-sm ${
                message.startsWith('✅') ? 'text-green-600' : 'text-red-500'
              }`}
            >
              {message}
            </p>
          )}

          {/* Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn bg-gray-300 hover:bg-gray-400 text-black"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn bg-blue-500 hover:bg-blue-600 text-white"
            >
              {loading ? 'Registering...' : 'Register'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}