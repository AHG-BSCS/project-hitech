import React from 'react';
import GradesAnalysis from './GradesAnalysis';
import { useState } from 'react';

export default function ViewStudent({ student, onClose, onGenerateSF9 }) {
  if (!student) return null;
  const [showGradeAnalysis, setShowGradeAnalysis] = useState(false);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 z-50 overflow-y-auto">
      <div className="min-h-screen flex items-center justify-center p-4">
        <div
          className="bg-white rounded-lg shadow-md p-6 w-full max-w-3xl max-h-screen overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-lg text-black font-bold mb-4">
            View Student
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">Learning Reference No.</label>
              <input
                type="text"
                value={student.learningReferenceNumber || ''}
                className="input input-bordered w-full bg-white border border-gray-300 text-black cursor-default"
                readOnly
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1">Last Name</label>
                <input type="text" value={student.lastName || ''} className="input input-bordered w-full cursor-default" readOnly />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1">First Name</label>
                <input type="text" value={student.firstName || ''} className="input input-bordered w-full cursor-default" readOnly />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1">Middle Name</label>
                <input type="text" value={student.middleName || ''} className="input input-bordered w-full cursor-default" readOnly />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1">Extension</label>
                <input type="text" value={student.nameExtension || ''} className="input input-bordered w-full cursor-default" readOnly />
              </div>
            </div>

            <div className="flex gap-10">
              <div className="relative">
                <label className="block text-sm font-medium text-gray-800 mb-1">Birthdate</label>
                <input
                  type="date"
                  value={student.birthdate || ''}
                  className="input input-bordered w-full bg-white border border-gray-300 text-black pr-10 cursor-default"
                  readOnly
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1">Sex</label>
                <input
                  type="text"
                  value={student.sex || ''}
                  className="input input-bordered w-full bg-white border border-gray-300 text-black cursor-default"
                  readOnly
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1">School Year</label>
                <input type="text" value={student.schoolYear || ''} className="input input-bordered w-full cursor-default" readOnly />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1">Grade</label>
                <input type="text" value={student.gradeLevel || ''} className="input input-bordered w-full cursor-default" readOnly />
              </div>
            </div>

            <div className="flex justify-end space-x-2 mt-4 pt-4">
              <button
                type="button"
                className="btn bg-blue-500 hover:bg-blue-600 text-white"
                onClick={() => setShowGradeAnalysis(true)}
              >
                Grades Analysis
              </button>
              <button
                type="button"
                className="btn bg-blue-500 hover:bg-blue-600 text-white"
                onClick={() => onGenerateSF9(student)}
              >
                SF9
              </button>
              <button
                type="button"
                className="btn bg-gray-300 hover:bg-gray-400 text-black"
                onClick={onClose}
              >
                Close
              </button>
            </div>
          </div>
        </div>
        {showGradeAnalysis && (
          <GradesAnalysis
            student={student}
            onClose={() => setShowGradeAnalysis(false)}
          />
        )}
      </div>
    </div>
  );
}