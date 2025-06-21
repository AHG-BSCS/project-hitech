import { useState, useEffect } from 'react';
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

export default function Register({ open, onClose, refreshUsers }) {
  const [form, setForm] = useState({
    email: '',
    employeeId: '',
    role: '',
  });

  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  if (!open) return null;

  useEffect(() => {
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
  }, []);

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

          <label className="text-sm text-gray-700 font-medium mb-1 block">Select Role</label>
          <select
            name="role"
            className="select select-bordered w-full mb-4"
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

          {message && (
            <p
              className={`text-sm mb-3 ${
                message.startsWith('✅') ? 'text-green-600' : 'text-red-500'
              }`}
            >
              {message}
            </p>
          )}
          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={loading || !form.email || !form.employeeId || !form.role}
          >
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>
      </div>
    </div>
  );
}