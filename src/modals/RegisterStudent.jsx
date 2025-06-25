import React, { useEffect, useState } from 'react';
import { addDoc, collection, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

export default function RegisterStudent({ open, onClose, refreshStudents, studentToEdit }) {
  const [learningReferenceNumber, setLRN] = useState('');
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [nameExtension, setNameExtension] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [sex, setSex] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (studentToEdit) {
      setLRN(studentToEdit.learningReferenceNumber || '');
      setFirstName(studentToEdit.firstName || '');
      setMiddleName(studentToEdit.middleName || '');
      setLastName(studentToEdit.lastName || '');
      setNameExtension(studentToEdit.nameExtension || '');
      setBirthdate(studentToEdit.birthdate || '');
      setSex(studentToEdit.sex || '');
    } else {
      setLRN('');
      setFirstName('');
      setMiddleName('');
      setLastName('');
      setNameExtension('');
      setBirthdate('');
      setSex('');
    }
    setMessage('');
  }, [studentToEdit]);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    if (!learningReferenceNumber.trim() || !firstName.trim() || !lastName.trim() || !sex || !birthdate) {
      setMessage('⚠️ Please complete all required fields.');
      return;
    }

    setLoading(true);

    try {
      const studentData = {
        learningReferenceNumber,
        firstName,
        middleName,
        lastName,
        nameExtension,
        birthdate,
        sex,
      };

      if (studentToEdit) {
        const studentRef = doc(db, 'students', studentToEdit.id);
        await updateDoc(studentRef, studentData);
        setMessage('✅ Student updated successfully!');
        onClose();
      } else {
        await addDoc(collection(db, 'students'), {
          ...studentData,
          createdAt: new Date(),
        });
        setMessage('✅ Student added successfully!');
      }

      refreshStudents();
    } catch (error) {
      console.error('Error saving student:', error);
      setMessage('❌ Failed to save student.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg shadow-md p-6 w-full h-auto mx-20 my-20" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg text-black font-bold mb-4">{studentToEdit ? 'Edit Student' : 'Register New Student'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1">Learning Reference No.</label>
            <input
              type="number"
              className="input input-bordered w-[500px] bg-white border border-gray-300 text-black"
              value={learningReferenceNumber}
              onChange={(e) => (setLRN(e.target.value), setMessage(''))}
              placeholder='E.g. 109791000000'
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">Last Name</label>
              <input
                type="text"
                className="input input-bordered w-full bg-white border border-gray-300 text-black"
                value={lastName}
                onChange={(e) => (setLastName(e.target.value), setMessage(''))}
                placeholder='E.g. Dela Cruz'
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
                placeholder='E.g. Juan'
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">Middle Name</label>
              <input
                type="text"
                className="input input-bordered w-full bg-white border border-gray-300 text-black"
                value={middleName}
                onChange={(e) => (setMiddleName(e.target.value), setMessage(''))}
                placeholder='E.g. Reyes'
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">Extension</label>
              <input
                type="text"
                className="input input-bordered w-full bg-white border border-gray-300 text-black"
                value={nameExtension}
                onChange={(e) => (setNameExtension(e.target.value), setMessage(''))}
                placeholder='E.g. Jr, II, III'
              />
            </div>
          </div>

          <div className="flex gap-10">
            <div className="relative">
              <label className="block text-sm font-medium text-gray-800 mb-1">Date</label>
              <input
                type="date"
                className="input input-bordered w-full bg-white border border-gray-300 text-black pr-10"
                value={birthdate}
                onChange={(e) => setBirthdate(e.target.value)}
                required
              />
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5 text-gray-800 absolute right-3 top-11 transform -translate-y-1/2 pointer-events-none"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">Sex</label>
              <div className="flex items-center space-x-6">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    className="form-radio text-blue-600"
                    name="sex"
                    value="Male"
                    checked={sex === 'Male'}
                    onChange={(e) => (setSex(e.target.value), setMessage(''))}
                  />
                  <span className="ml-2 text-black">Male</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    className="form-radio text-blue-600"
                    name="sex"
                    value="Female"
                    checked={sex === 'Female'}
                    onChange={(e) => (setSex(e.target.value), setMessage(''))}
                  />
                  <span className="ml-2 text-black">Female</span>
                </label>
              </div>
            </div>
          </div>

          {message && (
            <p className={`text-sm ${message.startsWith('✅') ? 'text-green-600' : 'text-red-500'}`}>
              {message}
            </p>
          )}

          <div className="flex justify-end space-x-2 mt-auto pt-4">
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
              {loading ? (studentToEdit ? 'Updating...' : 'Registering...') : studentToEdit ? 'Update' : 'Register'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}