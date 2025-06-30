import React, { useEffect, useState } from 'react';
import { collection, getDoc, getDocs, query, where, doc } from 'firebase/firestore';
import { db } from '../firebase';

export default function GradesAnalysis({ student, onClose }) {
  const [grades, setGrades] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!student) return;

    const fetchGrades = async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, 'grades'),
          where('studentId', '==', student.id)
        );
        const snapshot = await getDocs(q);

        const gradeMap = {};
        const subjectIdSet = new Set();

        snapshot.forEach(docSnap => {
          const data = docSnap.data();
        
          if (data?.subjectId) {
            const grade = {};
        
            ['q1', 'q2', 'q3', 'q4'].forEach(q => {
              if (data[q]?.finalized) {
                grade[q] = data[q].grade;
              } else {
                grade[q] = null;
              }
            });
        
            const hasAnyFinalized = Object.values(grade).some(val => val !== null);
        
            if (hasAnyFinalized) {
              gradeMap[data.subjectId] = grade;
              subjectIdSet.add(data.subjectId);
            }
          }
        });                 

        const subjectNames = {};
        await Promise.all(
          Array.from(subjectIdSet).map(async (id) => {
            try {
              const subjDoc = await getDoc(doc(db, 'subjects', id));
              if (subjDoc.exists()) {
                subjectNames[id] = subjDoc.data().name || id;
              } else {
                subjectNames[id] = id;
              }
            } catch (err) {
              subjectNames[id] = id; // fallback
            }
          })
        );

        const gradesWithNames = {};
        Object.entries(gradeMap).forEach(([id, grade]) => {
          const name = subjectNames[id] || id;
          gradesWithNames[name] = grade;
        });

        setGrades(gradesWithNames);
      } catch (error) {
        console.error('Error fetching grades:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchGrades();
  }, [student]);

  if (!student || loading) return null;

  const subjects = Object.entries(grades);

  const getFinalFromGrade = (grade) => {
    if (!grade || typeof grade !== 'object') return null;
  
    const keys = ['q1', 'q2', 'q3', 'q4'];
    const values = keys.map(k => {
      const val = typeof grade[k] === 'string' ? parseFloat(grade[k]) : grade[k];
      return typeof val === 'number' && !isNaN(val) ? val : null;
    });
  
    if (values.some(v => v === null)) return null;
  
    const total = values.reduce((sum, val) => sum + val, 0);
    return total / values.length;
  };  

  const getFinalAverage = () => {
    const finals = subjects
      .map(([_, g]) => getFinalFromGrade(g))
      .filter(n => typeof n === 'number');
    const total = finals.reduce((sum, val) => sum + val, 0);
    return finals.length ? (total / finals.length).toFixed(2) : 'N/A';
  };

  const isAtRisk = subjects.some(([_, g]) => {
    const final = getFinalFromGrade(g);
    return final !== null && final < 75;
  });

  const attendance = student.attendance || {
    totalDays: 200,
    daysPresent: 180,
    daysAbsent: 20,
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg shadow-md p-6 w-full max-w-4xl mx-4 overflow-y-auto max-h-[90vh]">
        <h2 className="text-xl font-bold text-black mb-4">
          Grades Analysis - {student.firstName} {student.lastName}
        </h2>

        <div className="overflow-x-auto">
          <table className="table w-full text-sm text-left text-black mb-6">
            <thead className="bg-gray-100 text-black">
              <tr>
                <th>Subject</th>
                <th>Q1</th>
                <th>Q2</th>
                <th>Q3</th>
                <th>Q4</th>
                <th>Final</th>
              </tr>
            </thead>
            <tbody>
              {subjects.map(([subjectName, grade]) => {
                const final = getFinalFromGrade(grade);
                return (
                  <tr key={subjectName}>
                    <td>{subjectName}</td>
                    <td>{grade.q1 ?? '-'}</td>
                    <td>{grade.q2 ?? '-'}</td>
                    <td>{grade.q3 ?? '-'}</td>
                    <td>{grade.q4 ?? '-'}</td>
                    <td className={final !== null && final < 75 ? 'text-red-600 font-semibold' : ''}>
                      {final !== null ? final.toFixed(2) : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mb-6">
          <p className="text-black font-semibold">
            Final Average: <span className="text-blue-700">{getFinalAverage()}</span>
          </p>
          <p className={`mt-1 font-medium ${isAtRisk ? 'text-red-600' : 'text-green-600'}`}>
            {isAtRisk
              ? '⚠️ Student is at risk of receiving a failing remark in one or more subjects.'
              : '✅ Student is not at risk of failing.'}
          </p>
        </div>

        <div className="border-t pt-4">
          <h3 className="text-lg font-semibold text-black mb-2">Attendance Summary</h3>
          <ul className="text-black text-sm space-y-1">
            <li>Total School Days: <span className="font-semibold">{attendance.totalDays}</span></li>
            <li>Days Present: <span className="font-semibold">{attendance.daysPresent}</span></li>
            <li>Days Absent: <span className="font-semibold">{attendance.daysAbsent}</span></li>
          </ul>
        </div>

        <div className="flex justify-end mt-6">
          <button
            className="btn bg-gray-300 hover:bg-gray-400 text-black"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}