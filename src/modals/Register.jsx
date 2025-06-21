import { useState, useEffect } from 'react';
import { db, temp } from '../firebase';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signOut as secondarySignOut,
} from 'firebase/auth';
import { collection, setDoc, doc } from 'firebase/firestore';
import PERMISSIONS from '../modules/Permissions';

export default function Register({ open, onClose , refreshUsers }) {
  const [form, setForm] = useState({
    email: '',
    employeeId: '',
  });

  const [permissions, setPermissions] = useState(0);
  const [permissionInput, setPermissionInput] = useState('0');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  if (!open) return null;

  useEffect(() => {
    setPermissionInput(String(permissions));
  }, [permissions]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const togglePermission = (bit) => {
    setPermissions((prev) => prev ^ bit);
  };

  const handlePermissionInput = (e) => {
    const val = e.target.value;
    setPermissionInput(val);
    const intVal = parseInt(val, 10);
    if (!isNaN(intVal)) setPermissions(intVal);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
  
    const { email, employeeId } = form;
    const password = 'hitech123';
  
    try {
      const secondaryAuth = getAuth(temp);
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
      const newUser = userCredential.user;
  
      await setDoc(doc(db, 'users', newUser.uid), {
        uid: newUser.uid,
        email,
        employeeId,
        permissions,
        active: true,
      });
  
      await secondarySignOut(secondaryAuth);
  
      setMessage('✅ User registered successfully!');
      setForm({ email: '', employeeId: '' });

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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-sm bg-white shadow-xl p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-xl font-bold"
          onClick={onClose}
        >
          &times;
        </button>
        <h2 className="text-2xl font-bold text-center mb-4 text-black">Register</h2>
        <form onSubmit={handleRegister}>
          <input
            name="employeeId"
            placeholder="Employee ID"
            className="input input-bordered w-full mb-3"
            value={form.employeeId}
            onChange={handleChange}
            required
          />
          <p className="text-xs text-gray-500 mb-3">
            Default password is 'hitech123'
          </p>
          <input
            name="email"
            type="email"
            placeholder="Email"
            className="input input-bordered w-full mb-3"
            value={form.email}
            onChange={handleChange}
            required
          />

          <label className="text-sm text-gray-700 font-medium mb-1 block">Permission Integer</label>
          <input
            type="number"
            min="0"
            className="input input-bordered w-full mb-3"
            value={permissionInput}
            onChange={handlePermissionInput}
          />

          <div className="mb-3">
            <p className="font-semibold text-black mb-2">Permissions:</p>
            {Object.entries(PERMISSIONS).map(([name, bit]) => (
              <label key={name} className="flex items-center mb-1 text-sm text-black">
                <input
                  type="checkbox"
                  checked={(permissions & bit) === bit}
                  onChange={() => togglePermission(bit)}
                  className="mr-2"
                />
                {name.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}
              </label>
            ))}
          </div>

          {message && <p className={`text-sm mb-3 ${message.startsWith('✅') ? 'text-green-600' : 'text-red-500'}`}>{message}</p>}
          <button type="submit" className="btn btn-primary w-full" disabled={loading}>
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>
      </div>
    </div>
  );
}