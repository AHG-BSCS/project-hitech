import React, { useEffect, useState } from 'react';
import { addDoc, collection, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { CalendarDaysIcon } from '@heroicons/react/24/outline';

export default function RegisterStudent({ open, onClose, refreshStudents, studentToEdit, viewOnly = false }) {
  const [learningReferenceNumber, setLRN] = useState('');
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [nameExtension, setNameExtension] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [sex, setSex] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [schoolYear, setSchoolYear] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');

  useEffect(() => {
    if (studentToEdit) {
      setLRN(studentToEdit.learningReferenceNumber || '');
      setFirstName(studentToEdit.firstName || '');
      setMiddleName(studentToEdit.middleName || '');
      setLastName(studentToEdit.lastName || '');
      setNameExtension(studentToEdit.nameExtension || '');
      setBirthdate(studentToEdit.birthdate || '');
      setSex(studentToEdit.sex || '');
      setSchoolYear(studentToEdit.schoolYear || '');
      setGradeLevel(studentToEdit.gradeLevel || '');
    } else {
      setLRN('');
      setFirstName('');
      setMiddleName('');
      setLastName('');
      setNameExtension('');
      setBirthdate('');
      setSex('');
      setSchoolYear('');
      setGradeLevel('');
    }
    setMessage('');
  }, [studentToEdit]);

  if (!open) return null;

  const handleSchoolYearChange = (e) => {
    let input = e.target.value;
  
    if (e.nativeEvent.inputType === 'deleteContentBackward') {
      setSchoolYear(input);
      setMessage('');
      return;
    }
  
    const digits = input.replace(/[^0-9]/g, '');
  
    if (digits.length === 4) {
      const startYear = parseInt(digits, 10);
      const endYear = startYear + 1;
      const formatted = `${startYear}-${endYear}`;
      setSchoolYear(formatted);
    } else {
      setSchoolYear(input);
    }
  
    setMessage('');
  };  

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    if (!learningReferenceNumber.trim() || !firstName.trim() || !lastName.trim() || !sex || !birthdate) {
      setMessage('⚠️ Please complete all required fields.');
      return;
    }

    const yearPattern = /^(\d{4})-(\d{4})$/;
    const match = schoolYear.match(yearPattern);
    if (!match || parseInt(match[2]) !== parseInt(match[1]) + 1) {
      setMessage('⚠️ Please enter a valid school year format (e.g., 2025-2026).');
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
        schoolYear,
        gradeLevel,
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

      setLRN('');
      setFirstName('');
      setMiddleName('');
      setLastName('');
      setNameExtension('');
      setBirthdate('');
      setSex('');
      setSchoolYear('');
      setGradeLevel('');

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
      <h2 className="text-lg text-black font-bold mb-4">
        {viewOnly
          ? 'View Student'
          : studentToEdit
          ? 'Edit Student'
          : 'Add New Student'}
      </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1">Learning Reference No.</label>
            <input
              type="number"
              className={`input input-bordered w-full bg-white border border-gray-300 text-black ${viewOnly ? 'cursor-default' : ''}`}
              value={learningReferenceNumber}
              onChange={(e) => (setLRN(e.target.value), setMessage(''))}
              placeholder='E.g. 109791000000'
              required
              readOnly={viewOnly}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">Last Name</label>
              <input
                type="text"
                className={`input input-bordered w-full bg-white border border-gray-300 text-black ${viewOnly ? 'cursor-default' : ''}`}
                value={lastName}
                onChange={(e) => (setLastName(e.target.value), setMessage(''))}
                placeholder='E.g. Dela Cruz'
                required
                readOnly={viewOnly}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">First Name</label>
              <input
                type="text"
                className={`input input-bordered w-full bg-white border border-gray-300 text-black ${viewOnly ? 'cursor-default' : ''}`}
                value={firstName}
                onChange={(e) => (setFirstName(e.target.value), setMessage(''))}
                placeholder='E.g. Juan'
                required
                readOnly={viewOnly}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">Middle Name</label>
              <input
                type="text"
                className={`input input-bordered w-full bg-white border border-gray-300 text-black ${viewOnly ? 'cursor-default' : ''}`}
                value={middleName}
                onChange={(e) => (setMiddleName(e.target.value), setMessage(''))}
                placeholder='E.g. Reyes'
                readOnly={viewOnly}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">Extension</label>
              <input
                type="text"
                className={`input input-bordered w-full bg-white border border-gray-300 text-black ${viewOnly ? 'cursor-default' : ''}`}
                value={nameExtension}
                onChange={(e) => (setNameExtension(e.target.value), setMessage(''))}
                placeholder='E.g. Jr, II, III'
                readOnly={viewOnly}
              />
            </div>
          </div>

          <div className="flex gap-10">
            <div className="relative">
              <label className="block text-sm font-medium text-gray-800 mb-1">Birthdate</label>
              <input
                type="date"
                className={`input input-bordered w-full bg-white border border-gray-300 text-black pr-10 ${viewOnly ? 'cursor-default' : ''}`}
                value={birthdate}
                onChange={(e) => setBirthdate(e.target.value)}
                required
                readOnly={viewOnly}
              />
              <CalendarDaysIcon className="w-5 h-5 text-gray-800 absolute right-3 top-11 transform -translate-y-1/2 pointer-events-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">Sex</label>
              <div className="flex items-center space-x-6">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    className="form-radio text-blue-600 bg-white"
                    name="sex"
                    value="Male"
                    checked={sex === 'Male'}
                    onChange={(e) => (setSex(e.target.value), setMessage(''))}
                    disabled={viewOnly}
                  />
                  <span className="ml-2 text-black">Male</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    className="form-radio text-blue-600 bg-white"
                    name="sex"
                    value="Female"
                    checked={sex === 'Female'}
                    onChange={(e) => (setSex(e.target.value), setMessage(''))}
                    disabled={viewOnly}
                  />
                  <span className="ml-2 text-black">Female</span>
                </label>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">School Year</label>
              <input
                type="text"
                className={`input input-bordered w-full bg-white border border-gray-300 text-black ${viewOnly ? 'cursor-default' : ''}`}
                placeholder="e.g. 2025-2026"
                maxLength={9}
                value={schoolYear}
                onChange={handleSchoolYearChange}
                readOnly={viewOnly}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">Grade</label>
              <select
                className={`input input-bordered w-full bg-white border border-gray-300 text-black ${viewOnly ? 'cursor-default' : ''}`}
                value={gradeLevel}
                onChange={(e) => (setGradeLevel(e.target.value), setMessage(''))}
                disabled={viewOnly}
                required
              >
                <option value="">Select Grade</option>
                <option value="Grade 7">Grade 7</option>
                <option value="Grade 8">Grade 8</option>
                <option value="Grade 9">Grade 9</option>
                <option value="Grade 10">Grade 10</option>
              </select>
            </div>
          </div>

          {message && (
            <p className={`text-sm ${message.startsWith('✅') ? 'text-green-600' : 'text-red-500'}`}>
              {message}
            </p>
          )}

          <div className="flex justify-end space-x-2 mt-auto pt-4">
            {viewOnly && (<>
              <button
                type="button"
                className="btn bg-blue-500 hover:bg-blue-600 text-white"
              >
                SF9
              </button>
              <button
                type="button"
                className='btn bg-blue-500 hover:bg-blue-600 text-white'
              >
                SF10
              </button>
            </>)}
            <button
              type="button"
              onClick={onClose}
              className="btn bg-gray-300 hover:bg-gray-400 text-black"
              readOnly={loading}
            >
              Close
            </button>
            {!viewOnly && (
              <button
                type="submit"
                className="btn bg-blue-500 hover:bg-blue-600 text-white"
              >
                {loading ? (studentToEdit ? 'Updating...' : 'Adding...') : studentToEdit ? 'Update' : 'Add'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}