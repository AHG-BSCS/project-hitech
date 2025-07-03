import React, { useEffect, useState } from 'react';
import { getDocs, collection, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import PERMISSIONS, { hasPermission } from '../modules/Permissions';

export default function EncodeGrades({ isOpen, onClose, classId, subjectId, sectionName, subjectName, students, permissions }) {
  const [grades, setGrades] = useState({});
  const [finalized, setFinalized] = useState(false);
  const [modal, setModal] = useState({ open: false, message: '', type: 'info' });
  const [initialFinalized, setInitialFinalized] = useState({});

  const canManage = hasPermission(permissions, PERMISSIONS.MANAGE_GRADES);
  const canView = hasPermission(permissions, PERMISSIONS.ENCODE_GRADES);
  const enrolledStudents = students.filter(s => s.classId === classId);

  useEffect(() => {
    if (isOpen) {
      fetchGrades();
    }
  }, [isOpen]);

  const fetchGrades = async () => {
    const snapshot = await getDocs(collection(db, 'grades'));
    const data = {};
    const initialFinals = {};
  
    snapshot.docs.forEach(docu => {
      const val = docu.data();
      if (val.classId === classId && val.subjectId === subjectId) {
        data[val.studentId] = val;
  
        // Track which checkboxes were finalized initially
        initialFinals[val.studentId] = {
          q1: val.q1?.finalized || false,
          q2: val.q2?.finalized || false,
          q3: val.q3?.finalized || false,
          q4: val.q4?.finalized || false,
        };
      }
    });
  
    const formatted = {};
    const initFinal = {};
  
    students.forEach(stu => {
      formatted[stu.id] = data[stu.id] || {
        q1: { grade: '', finalized: false },
        q2: { grade: '', finalized: false },
        q3: { grade: '', finalized: false },
        q4: { grade: '', finalized: false },
      };
  
      initFinal[stu.id] = initialFinals[stu.id] || {
        q1: false,
        q2: false,
        q3: false,
        q4: false,
      };
    });
  
    setGrades(formatted);
    setInitialFinalized(initFinal);
  };  

  const handleGradeChange = (studentId, quarter, value) => {
    setGrades(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [quarter]: {
          ...prev[studentId]?.[quarter],
          grade: value
        }
      }
    }));
  };

  const handleToggleFinalized = (studentId, quarter) => {
    setGrades(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [quarter]: {
          ...prev[studentId]?.[quarter],
          finalized: !prev[studentId]?.[quarter]?.finalized
        }
      }
    }));
  };

  const saveGrades = async () => {
    const batch = [];
  
    for (const studentId in grades) {
      const g = grades[studentId];
      const ref = doc(db, 'grades', `${classId}_${subjectId}_${studentId}`);
      batch.push(setDoc(ref, {
        classId,
        subjectId,
        studentId,
        q1: g.q1,
        q2: g.q2,
        q3: g.q3,
        q4: g.q4
      }, { merge: true }));
    }
  
    await Promise.all(batch);
    setModal({ open: true, type: 'success', message: 'Grades saved successfully.' });
  };  

  const handleSaveGrades = async () => {
    for (const student of students) {
      const entry = grades[student.id];
      if (!entry) continue;
  
      for (const q of ['q1', 'q2', 'q3', 'q4']) {
        const isFinal = entry[q]?.finalized;
        const grade = entry[q]?.grade;
        const studentName = `${student.lastName || ''}, ${student.firstName || ''}`.trim();
  
        if (isFinal && (grade === '' || grade === undefined || grade === null)) {
          setModal({
            open: true,
            type: 'error',
            message: `Cannot finalize ${q.toUpperCase()} grade for ${studentName} without a grade.`,
          });
          return;
        }
  
        const numGrade = Number(grade);
        if (grade !== '' && (isNaN(numGrade) || numGrade < 0 || numGrade > 100)) {
          setModal({
            open: true,
            type: 'error',
            message: `Invalid ${q.toUpperCase()} grade for ${studentName}. Grade must be a number between 0 and 100.`,
          });
          return;
        }
      }
    }
  
    await saveGrades();
    setFinalized(true);
    setModal({
        open: true,
        type: 'success',
        message: 'Grades finalized successfully!',
      });
      
    setTimeout(() => {
    setModal({ open: false, message: '', type: 'info' });
    setModal({
        open: false,
        type: 'info',
        message: '',
      });
    onClose();
    }, 1500);
  };
  
  const Modal = ({ open, type, message, onClose }) => {
    if (!open) return null;
  
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
        <div
          className="bg-white rounded-lg shadow-lg p-6 w-full max-w-xs text-center transform transition-transform duration-200 scale-100"
          role="dialog"
          aria-modal="true"
        >
          <h3 className={`text-lg font-bold mb-2 ${type === 'error' ? 'text-red-600' : 'text-green-700'}`}>
            {type === 'error' ? 'Error' : 'Success'}
          </h3>
          <p className="mb-4 text-black">{message}</p>
          <button
            className="btn bg-blue-600 text-white w-full"
            onClick={onClose}
          >
            OK
          </button>
        </div>
      </div>
    );
  };  

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-40 flex items-center justify-center">
      <div className="bg-white w-full max-w-4xl p-6 rounded shadow-lg">
        <div className="flex justify-between mb-4">
          <h2 className="text-xl text-black font-bold">{sectionName} - {subjectName}</h2>
        </div>

        <div className="overflow-auto max-h-[70vh]">
          <table className="table text-sm w-full">
            <thead>
              <tr className='text-black'>
                <th>Student</th>
                {['q1', 'q2', 'q3', 'q4'].map(q => <th key={q}>{q.toUpperCase()}</th>)}
              </tr>
            </thead>
            <tbody>
                {enrolledStudents.map(stu => {
                const entry = grades[stu.id] || {};
                const displayName = `${stu.lastName || ''}, ${stu.firstName || ''}`;
                return (
                  <tr key={stu.id}>
                    <td className='text-black'>{displayName}</td>
                    {['q1', 'q2', 'q3', 'q4'].map(q => (
                      <td key={q}>
                        <input
                            type="number"
                            min="0"
                            max="100"
                            className="input input-bordered w-20 bg-white text-black border-gray-300"
                            value={entry[q]?.grade || ''}
                            onChange={(e) => handleGradeChange(stu.id, q, e.target.value)}
                            disabled={entry[q]?.finalized && !canManage}
                            />
                        <div className="text-xs mt-1">
                          <label className='text-gray-800'>
                          <input
                            type="checkbox"
                            checked={entry[q]?.finalized || false}
                            onChange={() => handleToggleFinalized(stu.id, q)}
                            disabled={initialFinalized[stu.id]?.[q]}
                          />
                            Finalized
                          </label>
                        </div>
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn bg-gray-300 hover:bg-gray-400 text-black"
            >
              Close
            </button>
            <button
              type="submit"
              className="btn bg-blue-500 hover:bg-blue-600 text-white"
              onClick={handleSaveGrades}
            >
              Save Grades
            </button>
          </div>

          <Modal
            open={modal.open}
            type={modal.type}
            message={modal.message}
            onClose={() => setModal({ open: false, message: '', type: 'info' })}
            />
      </div>
    </div>
  );
}