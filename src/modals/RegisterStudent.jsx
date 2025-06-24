import React, { useState } from 'react';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../firebase';

export default function RegisterStudent({ open, onClose, refreshStudents }) {
  const [learningReferenceNumber, setLRN] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [sex, setSex] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    if (!learningReferenceNumber.trim() || !firstName.trim() || !lastName.trim() || !sex) {
      setMessage('⚠️ Please complete all fields.');
      return;
    }

    setLoading(true);

    try {
      await addDoc(collection(db, 'students'), {
        learningReferenceNumber,
        firstName,
        lastName,
        sex,
        createdAt: new Date(),
      });

      refreshStudents();

      // Clear inputs and show success message
      setLRN('');
      setFirstName('');
      setLastName('');
      setSex('');
      setMessage('✅ Student added successfully!');
    } catch (error) {
      console.error('Error registering student:', error);
      setMessage('❌ Failed to register student.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg shadow-md p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg text-black font-bold mb-4">Register New Student</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1">Learning Reference No.</label>
            <input
              type="text"
              className="input input-bordered w-full bg-white border border-gray-300 text-black"
              value={learningReferenceNumber}
              onChange={(e) => (setLRN(e.target.value), setMessage(''))}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1">First Name</label>
            <input
              type="text"
              className="input input-bordered w-full bg-white border border-gray-300 text-black"
              value={firstName}
              onChange={(e) => (setFirstName(e.target.value), setMessage(''))}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1">Last Name</label>
            <input
              type="text"
              className="input input-bordered w-full bg-white border border-gray-300 text-black"
              value={lastName}
              onChange={(e) => (setLastName(e.target.value), setMessage(''))}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1">Sex</label>
            <select
              className="select select-bordered w-full bg-white text-black"
              value={sex}
              onChange={(e) => (setSex(e.target.value), setMessage(''))}
              required
            >
              <option value="" disabled>Select Sex</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>

          {message && (
            <p
              className={`text-sm ${
                message.startsWith('✅') ? 'text-green-600' : 'text-red-500'
              }`}
            >
              {message}
            </p>
          )}

          <div className="flex justify-end space-x-2 pt-4">
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
              {loading ? 'Registering...' : 'Register'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}