import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, setDoc, doc } from 'firebase/firestore';

export default function RegisterClassModal({ open, onClose, onSaved, initialData, users = [] }) {
  const [gradeLevel, setGradeLevel] = useState('');
  const [sectionName, setSectionName] = useState('');
  const [adviser, setAdviser] = useState('');
  const [adviserId, setAdviserId] = useState('');
  const [schoolYear, setSchoolYear] = useState('');
  const [adviserSearch, setAdviserSearch] = useState('');
  const [adviserDropdownOpen, setAdviserDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (open) {
      setGradeLevel(initialData?.gradeLevel || '');
      setSectionName(initialData?.sectionName || '');
      setAdviser(initialData?.adviser || '');
      setAdviserId(initialData?.adviserId || '');
      setSchoolYear(initialData?.schoolYear || '');
      setAdviserSearch('');
      setAdviserDropdownOpen(false);
      setMessage('');
    }
  }, [initialData, open]);  

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const classData = {
        gradeLevel,
        sectionName,
        adviser,
        adviserId,
        schoolYear,
        createdAt: initialData?.createdAt || new Date(),
      };
      
      if (initialData?.id) {
        await setDoc(doc(db, 'classes', initialData.id), classData, { merge: true });
        setMessage('✅ Class updated successfully!');
      } else {
        await addDoc(collection(db, 'classes'), classData);
        setGradeLevel('');
        setSectionName('');
        setAdviser('');
        setAdviserId('');
        setSchoolYear('');
        setMessage('✅ Class added successfully!');
      }

      if (typeof onSaved === 'function') onSaved();
      } catch (err) {
        console.error('Failed to save class:', err);
        setMessage(`❌ ${err.message}`);
      } finally {
        setLoading(false);
      }
  };

  // School year options: previous year to 3 years ahead
  const getSchoolYearOptions = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const startYear = currentYear - 1;
    const options = [];
    for (let i = -1; i <= 3; i++) {
      const y1 = startYear + i;
      const y2 = y1 + 1;
      options.push(`${y1}-${y2}`);
    }
    return options;
  };
  const schoolYearOptions = getSchoolYearOptions();

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-xl font-bold text-black mb-4 text-center">
          {initialData?.id ? 'Edit Class' : 'Add Class'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-1 text-gray-800 font-medium">Grade Level</label>
            <select
              className="input input-bordered w-full bg-white text-black border border-gray-300"
              value={gradeLevel}
              onChange={e => (setGradeLevel(e.target.value), setMessage(''))}
              required
            >
              <option value="" disabled>Select grade level</option>
              {[7,8,9,10].map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-1 text-gray-800 font-medium">Section Name</label>
            <input
              type="text"
              className="input input-bordered w-full bg-white text-black border border-gray-300"
              value={sectionName}
              onChange={e => (setSectionName(e.target.value), setMessage(''))}
              required
            />
          </div>

          <div>
            <label className="block mb-1 text-gray-800 font-medium">School Year</label>
            <select
              className="input input-bordered w-full bg-white text-black border border-gray-300"
              value={schoolYear}
              onChange={e => (setSchoolYear(e.target.value), setMessage(''))}
              required
            >
              <option value="" disabled>Select school year</option>
              {schoolYearOptions.map(yr => (
                <option key={yr} value={yr}>{yr}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-1 text-gray-800 font-medium">Adviser</label>
            <div className="relative">
              <input
                type="text"
                className="input input-bordered w-full bg-white text-black border border-gray-300 mb-1"
                placeholder="Search adviser by name or email"
                value={adviserSearch || adviser}
                onChange={e => {
                  setAdviserSearch(e.target.value);
                  setAdviserDropdownOpen(true);
                }}
                autoComplete="off"
                onFocus={() => setAdviserDropdownOpen(true)}
                onBlur={() => setTimeout(() => setAdviserDropdownOpen(false), 150)}
              />
              {adviserDropdownOpen && (
                <ul className="absolute z-20 bg-white text-black border border-gray-300 w-full max-h-40 overflow-y-auto rounded shadow">
                  {(adviserSearch === '' ? users : users.filter(u =>
                    (u.name || '').toLowerCase().includes(adviserSearch.toLowerCase()) ||
                    (u.email || '').toLowerCase().includes(adviserSearch.toLowerCase())
                  ))
                    .filter(u => u.active !== false) // Only show active users
                    .map(u => (
                      <li
                        key={u.id}
                        className="px-4 py-2 hover:bg-blue-100 cursor-pointer"
                        onMouseDown={() => {
                          setAdviser(u.name ? `${u.name} (${u.email})` : u.email);
                          setAdviserId(u.id);
                          setAdviserSearch('');
                          setAdviserDropdownOpen(false);
                        }}
                        
                      >
                        {u.name ? `${u.name} (${u.email})` : u.email}
                      </li>
                    ))}
                  {(adviserSearch !== '' && users.filter(u =>
                    (u.name || '').toLowerCase().includes(adviserSearch.toLowerCase()) ||
                    (u.email || '').toLowerCase().includes(adviserSearch.toLowerCase())
                  ).filter(u => u.active !== false).length === 0) && (
                    <li className="px-4 py-2 text-gray-400">No advisers found</li>
                  )}
                </ul>
              )}
            </div>
          </div>

          {message && (
            <p className={`text-sm ${message.startsWith('✅') ? 'text-green-600' : 'text-red-500'}`}>
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
              {loading ? (initialData ? 'Saving...' : 'Adding...') : (initialData ? 'Save' : 'Add')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}