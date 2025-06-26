import React, { useState } from 'react';
import { auth, db } from '../firebase';
import { updatePassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

export default function ForcePasswordChange({ user, onPasswordChanged }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!user || !user.email || !user.tempPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded shadow-md w-full max-w-md text-center text-red-600">
          Error: User information is missing. Please try logging in again.
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      // If not authenticated, try to sign in with temp password
      if (!auth.currentUser) {
        await signInWithEmailAndPassword(auth, user.email, user.tempPassword);
      }
      await updatePassword(auth.currentUser, password);
      await setDoc(doc(db, 'users', user.uid), {
        requirePasswordChange: false,
        tempPassword: '',
      }, { merge: true });
      onPasswordChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form className="bg-white p-8 rounded shadow-md w-full max-w-md" onSubmit={handleSubmit}>
        <h2 className="text-xl font-bold mb-4">Set a New Password</h2>
        <div className="mb-4">
          <label className="block mb-1">New Password</label>
          <input
            type="password"
            className="input input-bordered w-full"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
        </div>
        <div className="mb-4">
          <label className="block mb-1">Confirm Password</label>
          <input
            type="password"
            className="input input-bordered w-full"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            required
          />
        </div>
        {error && <div className="text-red-500 mb-2">{error}</div>}
        <button type="submit" className="btn bg-blue-600 text-white w-full" disabled={loading}>
          {loading ? 'Saving...' : 'Change Password'}
        </button>
      </form>
    </div>
  );
}
