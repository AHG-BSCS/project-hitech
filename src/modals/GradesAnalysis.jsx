import React from 'react';

export default function GradesAnalysis({ student, onClose }) {
  if (!student) return null;

  student = {
    firstName: student.firstName,
    lastName: student.lastName,
    grades: {
        Mathematics: { q1: 85, q2: 87, q3: 83, q4: 86, final: 85 },
        English: { q1: 90, q2: 92, q3: 89, q4: 91, final: 91 },
        Science: { q1: 78, q2: 75, q3: 77, q4: 80, final: 78 },
        TLE: { q1: 70, q2: 72, q3: 68, q4: 74, final: 71 }, // at risk
        MAPEH: { q1: 95, q2: 94, q3: 96, q4: 97, final: 96 },
    },
    attendance: {
        totalDays: 200,
        daysPresent: 180,
        daysAbsent: 20,
    }
};

  const subjects = Object.entries(student.grades);

  const getFinalAverage = () => {
    const finals = subjects.map(([_, g]) => g.final).filter(g => typeof g === 'number');
    const total = finals.reduce((sum, val) => sum + val, 0);
    return finals.length ? (total / finals.length).toFixed(2) : 'N/A';
  };

  const isAtRisk = subjects.some(([_, g]) => g.final < 75);

  const attendance = student.attendance || {
    totalDays: 200,
    daysPresent: 180,
    daysAbsent: 20,
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg shadow-md p-6 w-full max-w-4xl mx-4 overflow-y-auto max-h-[90vh]">
        <h2 className="text-xl font-bold text-black mb-4">Grades Analysis - {student.firstName} {student.lastName}</h2>

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
              {subjects.map(([subject, grade]) => (
                <tr key={subject}>
                  <td>{subject}</td>
                  <td>{grade.q1}</td>
                  <td>{grade.q2}</td>
                  <td>{grade.q3}</td>
                  <td>{grade.q4}</td>
                  <td className={grade.final < 75 ? 'text-red-600 font-semibold' : ''}>{grade.final}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mb-6">
          <p className="text-black font-semibold">Final Average: <span className="text-blue-700">{getFinalAverage()}</span></p>
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