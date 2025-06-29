import React, { useState, useEffect } from 'react';
import { db, temp } from '../firebase';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signOut as secondarySignOut,
  sendEmailVerification,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  collection,
  setDoc,
  getDocs,
} from 'firebase/firestore';
import bcrypt from 'bcryptjs';

export default function RegisterUser({ open, onClose, refreshUsers, editUser }) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    employeeId: '',
    role: '',
  });
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [generatePassword, setGeneratePassword] = useState(true);
  const [customPassword, setCustomPassword] = useState('');
  const [requirePasswordChange, setRequirePasswordChange] = useState(true);
  const [defaultPassword, setDefaultPassword] = useState('');
  const [defaultPasswordPlain, setDefaultPasswordPlain] = useState('');

  useEffect(() => {
    if (!open) return;

    if (editUser) {
      setForm({
        name: editUser.name || '',
        email: editUser.email || '',
        employeeId: editUser.employeeId || '',
        role: editUser.role || '',
      });
      setMessage('');
    } else {
      setForm({ name: '', email: '', employeeId: '', role: '' });
      setRequirePasswordChange(true);
      setCustomPassword('');
      setMessage('');
    }

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

    const fetchDefaultPassword = async () => {
      try {
        const settingsRef = doc(db, 'system', 'settings');
        const settingsSnap = await getDoc(settingsRef);
        if (settingsSnap.exists()) {
          const data = settingsSnap.data();
          if (data.userDefaultPassword) {
            setDefaultPassword(data.userDefaultPassword);
          }
          if (data.userDefaultPasswordPlaintext) {
            setDefaultPasswordPlain(data.userDefaultPasswordPlaintext);
          }
        }
      } catch (err) {
        console.error('Failed to fetch default password:', err);
      }
    };

    fetchRoles();
    if (!editUser) fetchDefaultPassword();
  }, [open, editUser]);

  if (!open) return null;

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const { name, email, employeeId, role } = {
      name: form.name.trim(),
      email: form.email.trim(),
      employeeId: form.employeeId.trim(),
      role: form.role,
    };

    try {
      if (editUser) {
        // Update user
        const roleObj = roles.find(r => r.name === role);
        if (!roleObj) throw new Error('Selected role is invalid');
        await setDoc(doc(db, 'users', editUser.id), {
          ...editUser,
          name,
          email,
          employeeId,
          role: roleObj.name,
          permissions: roleObj.permission,
        }, { merge: true });
        setMessage('✅ User updated successfully!');
        if (typeof refreshUsers === 'function') refreshUsers();
      } else {
        let password = 'hitech123';
        if (defaultPasswordPlain) {
          password = defaultPasswordPlain;
        } else if (defaultPassword) {
          // If defaultPassword is a bcrypt hash, use customPassword if provided, else show error
          if (defaultPassword.startsWith('$2a$') || defaultPassword.startsWith('$2b$') || defaultPassword.startsWith('$2y$')) {
            if (customPassword) {
              password = customPassword;
            } else {
              setMessage('❌ Please enter a password or set a default password in Portal Settings.');
              setLoading(false);
              return;
            }
          } else {
            password = defaultPassword;
          }
        }

        // Check for duplicate email or employeeId
        const usersRef = collection(db, 'users');
        const snapshot = await getDocs(usersRef);
        let emailExists = false;
        let employeeIdExists = false;
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          if (data.email === email) emailExists = true;
          if (data.employeeId === employeeId) employeeIdExists = true;
        });
        if (emailExists || employeeIdExists) {
          let msg = '❌ ';
          if (emailExists && employeeIdExists) {
            msg += 'Email and Employee ID already exist.';
          } else if (emailExists) {
            msg += 'Email already exists.';
          } else {
            msg += 'Employee ID already exists.';
          }
          setMessage(msg);
          setLoading(false);
          return;
        }

        const roleObj = roles.find(r => r.name === role);
        if (!roleObj) throw new Error('Selected role is invalid');

        const secondaryAuth = getAuth(temp);
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
        const newUser = userCredential.user;

        console.log('requirePasswordChange value:', requirePasswordChange); // Debug log
        await setDoc(doc(db, 'users', newUser.uid), {
          uid: newUser.uid,
          name,
          email,
          employeeId,
          role: roleObj.name,
          permissions: roleObj.permission,
          active: true,
          defaultPassword: true,
          requirePasswordChange: !!requirePasswordChange, // Ensure boolean
        });

        await secondarySignOut(secondaryAuth);

        setForm({ name: '', email: '', employeeId: '', role: '' });
        setMessage(`✅ User added successfully!`);

        if (typeof refreshUsers === 'function') {
          refreshUsers();
        }
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
        <h2 className="text-lg font-bold text-black mb-4 text-center">{editUser ? 'Edit User' : 'Add New User'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1">Full Name</label>
            <input
              name="name"
              placeholder="Full Name"
              className="input input-bordered w-full bg-white border border-gray-300 text-black"
              value={form.name}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1">Employee ID</label>
            <input
              name="employeeId"
              placeholder="Employee ID"
              className="input input-bordered w-full bg-white border border-gray-300 text-black"
              value={form.employeeId}
              onChange={handleChange}
              required
              disabled={!!editUser}
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
              disabled={!!editUser}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1">Select Role</label>
            <select
              name="role"
              className="select select-bordered border-gray-300 w-full bg-white text-black"
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

          {/* Only show password/checkbox if not editing */}
          {!editUser && (
            <>
              <div>
                <label className="inline-flex items-center mt-2">
                  <input
                    type="checkbox"
                    className="form-checkbox"
                    checked={requirePasswordChange}
                    onChange={e => setRequirePasswordChange(e.target.checked)}
                  />
                  <span className="ml-2 text-sm text-gray-700">Require user to change password on first login</span>
                </label>
              </div>
              <p className="text-xs text-gray-500">Default password is <code>{defaultPasswordPlain ? `'${defaultPasswordPlain}'` : defaultPassword && !(defaultPassword.startsWith('$2a$') || defaultPassword.startsWith('$2b$') || defaultPassword.startsWith('$2y$')) ? `'${defaultPassword}'` : customPassword ? `'${customPassword}'` : 'Set in Portal Settings (bcrypt hash)'}</code></p>
            </>
          )}

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
              Close
            </button>
            <button
              type="submit"
              className="btn bg-blue-500 hover:bg-blue-600 text-white"
            >
              {loading ? (editUser ? 'Saving...' : 'Adding...') : (editUser ? 'Save' : 'Add')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}