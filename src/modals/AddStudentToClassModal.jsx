import React, { useState } from 'react';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase';

export default function AddStudentToClassModal({ open, onClose, classData, students, onStudentAdded, allClassStudentIds = [] }) {
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  if (!open || !classData) return null;

  const classStudentIds = Array.isArray(classData.students) ? classData.students : [];

  const handleCheckboxChange = (studentId) => {
    setSelectedStudentIds(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
    setMessage('');
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    if (selectedStudentIds.length === 0) {
      setMessage('Please select at least one student.');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      // Add students to class's students array
      const classRef = doc(db, 'classes', classData.id);
      await updateDoc(classRef, {
        students: arrayUnion(...selectedStudentIds),
      });
      // Update each student's classId field
      await Promise.all(selectedStudentIds.map(async (studentId) => {
        const studentRef = doc(db, 'students', studentId);
        await updateDoc(studentRef, { classId: classData.id });
      }));
      setMessage('✅ Student(s) added to class!');
      if (onStudentAdded) onStudentAdded();
      setTimeout(() => onClose(), 1000);
    } catch (err) {
      setMessage('❌ Failed to add student(s).');
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(s => {
    const searchLower = search.toLowerCase();
    return (
      s.firstName.toLowerCase().includes(searchLower) ||
      s.lastName.toLowerCase().includes(searchLower) ||
      (s.learningReferenceNumber && s.learningReferenceNumber.toString().includes(searchLower))
    );
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-xl font-bold text-black mb-4 text-center">
          Add Student to {classData.sectionName}
        </h2>
        <form onSubmit={handleAddStudent} className="space-y-4">
          <div>
            <label className="block mb-1 text-gray-800 font-medium">Select Student(s)</label>
            <input
              type="text"
              placeholder="Search by name or LRN..."
              className="input input-bordered w-full mb-2 bg-white text-black border border-gray-300"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <div className="max-h-48 overflow-y-auto border border-gray-200 rounded p-2 bg-white">
              {filteredStudents.length === 0 ? (
                <div className="text-gray-500 text-center">No students found.</div>
              ) : (
                filteredStudents.map(s => {
                  const alreadyInThisClass = classStudentIds.includes(s.id);
                  const alreadyInAnyClass = allClassStudentIds.includes(s.id);
                  return (
                    <label
                      key={s.id}
                      className={`flex items-center space-x-2 mb-1 ${alreadyInAnyClass ? 'text-gray-400 cursor-not-allowed' : 'text-black'}`}
                    >
                      <input
                        type="checkbox"
                        value={s.id}
                        checked={selectedStudentIds.includes(s.id)}
                        onChange={() => handleCheckboxChange(s.id)}
                        className="form-checkbox h-4 w-4 text-green-600"
                        disabled={alreadyInAnyClass}
                      />
                      <span>{s.lastName}, {s.firstName} ({s.learningReferenceNumber})</span>
                      {alreadyInThisClass && <span className="ml-2 text-xs text-gray-500">Already in this class</span>}
                      {alreadyInAnyClass && !alreadyInThisClass && <span className="ml-2 text-xs text-gray-500">In another class</span>}
                    </label>
                  );
                })
              )}
            </div>
          </div>
          {message && (
            <p className={`text-sm ${message.startsWith('✅') ? 'text-green-600' : 'text-red-500'}`}>{message}</p>
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
              className="btn bg-green-600 hover:bg-green-700 text-white"
              disabled={loading}
            >
              {loading ? 'Adding...' : 'Add Student(s)'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
