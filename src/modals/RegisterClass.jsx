import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, setDoc, doc } from 'firebase/firestore';

export default function RegisterClassModal({ open, onClose, onSaved, initialData, users = [] }) {
  const [gradeLevel, setGradeLevel] = useState('');
  const [sectionName, setSectionName] = useState('');
  const [adviser, setAdviser] = useState('');
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
      if (initialData?.id) {
        await setDoc(doc(db, 'classes', initialData.id), {
          gradeLevel,
          sectionName,
          adviser,
          schoolYear,
          createdAt: initialData.createdAt || new Date(),
        }, { merge: true });
        setMessage('✅ Class updated successfully!');
      } else {
        await addDoc(collection(db, 'classes'), {
          gradeLevel,
          sectionName,
          adviser,
          schoolYear,
          createdAt: new Date(),
        });
        setGradeLevel('');
        setSectionName('');
        setAdviser('');
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
            <input
              type="text"
              className="input input-bordered w-full bg-white text-black border border-gray-300"
              value={gradeLevel}
              onChange={e => (setGradeLevel(e.target.value), setMessage(''))}
              required
            />
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
            <input
              type="text"
              className="input input-bordered w-full bg-white text-black border border-gray-300"
              value={schoolYear}
              onChange={e => (setSchoolYear(e.target.value), setMessage(''))}
              placeholder="e.g. 2024-2025"
              required
            />
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
                  setAdviser('');
                  setAdviserDropdownOpen(true);
                }}
                autoComplete="off"
                onFocus={() => setAdviserDropdownOpen(true)}
                onBlur={() => setTimeout(() => setAdviserDropdownOpen(false), 150)}
              />
              {adviserDropdownOpen && (
                <ul className="absolute z-20 bg-white border border-gray-300 w-full max-h-40 overflow-y-auto rounded shadow">
                  {(adviserSearch === '' ? users : users.filter(u =>
                    (u.name || '').toLowerCase().includes(adviserSearch.toLowerCase()) ||
                    (u.email || '').toLowerCase().includes(adviserSearch.toLowerCase())
                  ))
                    .map(u => (
                      <li
                        key={u.id}
                        className="px-4 py-2 hover:bg-blue-100 cursor-pointer"
                        onMouseDown={() => {
                          setAdviser(u.name ? `${u.name} (${u.email})` : u.email);
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
                  ).length === 0) && (
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
              {loading ? 'Adding...' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}