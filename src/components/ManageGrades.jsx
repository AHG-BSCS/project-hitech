import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, getDocs, deleteDoc, doc, updateDoc, addDoc, setDoc } from 'firebase/firestore';
import PERMISSIONS, { hasPermission } from '../modules/Permissions';

export default function ManageGrades({ permissions }) {
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [grades, setGrades] = useState({});
  const [refresh, setRefresh] = useState(false);
  const [searchClass, setSearchClass] = useState('');
  const [searchSubject, setSearchSubject] = useState('');
  const [showGradeTable, setShowGradeTable] = useState({});
  const [finalized, setFinalized] = useState({}); // Track finalized state per class/subject
  const [showConfirm, setShowConfirm] = useState({}); // Track modal visibility per class/subject
  const [modal, setModal] = useState({ open: false, message: '', type: 'info' }); // Modal state for messages

  useEffect(() => {
    const fetchData = async () => {
      const [classSnap, subjectSnap, studentSnap, userSnap] = await Promise.all([
        getDocs(collection(db, 'classes')),
        getDocs(collection(db, 'subjects')),
        getDocs(collection(db, 'students')),
        getDocs(collection(db, 'users')),
      ]);
      setClasses(classSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setSubjects(subjectSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setStudents(studentSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setUsers(userSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchData();
  }, [refresh]);

  // Only show classes that have at least one assigned subject
  const classesWithSubjects = classes.filter(cls =>
    subjects.some(subj => subj.classId === cls.id)
  );

  // Helper to get subjects for a class
  const getSubjectsForClass = (classId) =>
    subjects.filter(subj => subj.classId === classId);

  // Helper to get students for a class
  const getStudentsForClass = (classId) =>
    students.filter(stu => {
      // Support both string and array for classId in student object
      if (Array.isArray(stu.classId)) {
        return stu.classId.includes(classId);
      }
      // Try common alternative field names if needed
      if (stu.class_id && Array.isArray(stu.class_id)) {
        return stu.class_id.includes(classId);
      }
      if (stu.class_id) {
        return stu.class_id === classId;
      }
      return stu.classId === classId;
    });

  // Helper to get teacher name
  const getTeacherName = (teacherId) =>
    users.find(u => u.id === teacherId)?.name || '-';

  // Fetch grades for a subject/class
  const fetchGrades = async (classId, subjectId) => {
    const gradesSnap = await getDocs(collection(db, 'grades'));
    const gradeData = {};
    let isFinal = false;
    gradesSnap.docs.forEach(docu => {
      const data = docu.data();
      if (data.classId === classId && data.subjectId === subjectId) {
        gradeData[data.studentId] = data.grade;
        if (data.finalized) isFinal = true;
      }
    });
    setGrades(prev => ({ ...prev, [`${classId}_${subjectId}`]: gradeData }));
    setFinalized(prev => ({ ...prev, [`${classId}_${subjectId}`]: isFinal }));
  };

  // Handle grade input change
  const handleGradeChange = (classId, subjectId, studentId, value) => {
    setGrades(prev => ({
      ...prev,
      [`${classId}_${subjectId}`]: {
        ...prev[`${classId}_${subjectId}`],
        [studentId]: value
      }
    }));
  };

  // Helper: validate all grades are present and valid (0-100)
  function areGradesValid(gradeEntries, students) {
    if (!students.length) return false;
    for (const stu of students) {
      const val = gradeEntries[stu.id];
      if (val === undefined || val === null || val === '') return false;
      const num = Number(val);
      if (isNaN(num) || num < 0 || num > 100) return false;
    }
    return true;
  }

  // Helper: for drafts, allow blanks but if filled, must be valid (0-100)
  function areDraftGradesValid(gradeEntries, students) {
    if (!students.length) return false;
    for (const stu of students) {
      const val = gradeEntries[stu.id];
      if (val === undefined || val === null || val === '') continue; // allow blank
      const num = Number(val);
      if (isNaN(num) || num < 0 || num > 100) return false;
    }
    return true;
  }

  // Save grades as draft (not final)
  const handleSaveDraft = async (classId, subjectId) => {
    const key = `${classId}_${subjectId}`;
    const gradeEntries = grades[key] || {};
    const studentsForClass = getStudentsForClass(classId);
    if (!areDraftGradesValid(gradeEntries, studentsForClass)) {
      setModal({ open: true, message: 'All filled grades must be valid (0-100) before saving as draft.', type: 'error' });
      return;
    }
    for (const stu of studentsForClass) {
      const grade = gradeEntries[stu.id];
      await setDoc(doc(db, 'grades', `${classId}_${subjectId}_${stu.id}`), {
        classId,
        subjectId,
        studentId: stu.id,
        grade,
        finalized: false
      });
    }
    setRefresh(r => !r);
    setModal({ open: true, message: 'Draft saved!', type: 'success' });
  };

  // Save grades as final (not editable)
  const handleSaveGrades = async (classId, subjectId) => {
    const key = `${classId}_${subjectId}`;
    const gradeEntries = grades[key] || {};
    const studentsForClass = getStudentsForClass(classId);
    if (!areGradesValid(gradeEntries, studentsForClass)) {
      setModal({ open: true, message: 'All grades must be filled in and valid (0-100) before finalizing.', type: 'error' });
      return;
    }
    for (const stu of studentsForClass) {
      const grade = gradeEntries[stu.id];
      await setDoc(doc(db, 'grades', `${classId}_${subjectId}_${stu.id}`), {
        classId,
        subjectId,
        studentId: stu.id,
        grade,
        finalized: true
      });
    }
    setFinalized(prev => ({ ...prev, [key]: true }));
    setRefresh(r => !r);
    setShowConfirm(prev => ({ ...prev, [key]: false }));
    setModal({ open: true, message: 'Grades finalized!', type: 'success' });
  };

  // Permission helpers
  const canManage = hasPermission(permissions, PERMISSIONS.MANAGE_GRADES);
  const canView = hasPermission(permissions, PERMISSIONS.ENCODE_GRADES);
  if (!canManage && !canView) {
    return (
      <Section title="Access Denied">
        <p className="text-red-500">You do not have permission to view grades.</p>
      </Section>
    );
  }

  // Helper to get grade tag
  function getGradeTag(grade) {
    if (grade === '' || grade === undefined || grade === null) return '';
    const num = Number(grade);
    if (isNaN(num)) return '';
    if (num >= 90 && num <= 100) return 'Outstanding';
    if (num >= 85 && num <= 89) return 'Very Satisfactory';
    if (num >= 80 && num <= 84) return 'Satisfactory';
    if (num >= 75 && num <= 78) return 'Fairly Satisfactory';
    if (num < 75) return 'Failed';
    if (num < 0 || num > 100) return 'Invalid'; // Handle impossible grades
    // Default case for unexpected values
    return '';
  }

  return (
    <div>
      <Section title="Manage Grades">
        <input
          type="text"
          placeholder="Search by Class Name"
          className="input input-bordered w-full bg-white border border-gray-300 text-black mb-4"
          value={searchClass}
          onChange={e => setSearchClass(e.target.value)}
        />
        <div className="overflow-x-auto">
          <table className="table w-full text-sm text-left text-gray-700">
            <thead className="bg-gray-100 text-black sticky top-0 z-10">
              <tr>
                <th>Class</th>
                <th>Subjects</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {classesWithSubjects
                .filter(cls =>
                  cls.sectionName?.toLowerCase().includes(searchClass.toLowerCase())
                )
                .map(cls => (
                  <tr key={cls.id}>
                    <td>{cls.sectionName}</td>
                    <td>
                      {getSubjectsForClass(cls.id).map(subj => (
                        <div key={subj.id} className="mb-2">
                          <span className="font-semibold">{subj.name}</span> <span className="text-xs text-gray-500">({getTeacherName(subj.teacherId)})</span>
                        </div>
                      ))}
                    </td>
                    <td>
                      {getSubjectsForClass(cls.id).map(subj => (
                        <button
                          key={subj.id}
                          className="btn btn-sm bg-blue-600 text-white mr-2 mb-2"
                          onClick={async () => {
                            setShowGradeTable(prev => ({ ...prev, [`${cls.id}_${subj.id}`]: !prev[`${cls.id}_${subj.id}`] }));
                            if (!grades[`${cls.id}_${subj.id}`]) await fetchGrades(cls.id, subj.id);
                          }}
                        >
                          {showGradeTable[`${cls.id}_${subj.id}`] ? 'Hide' : 'Encode Grades'}
                        </button>
                      ))}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Grade Encoding Tables */}
      {classesWithSubjects.map(cls => (
        getSubjectsForClass(cls.id).map(subj => (
          showGradeTable[`${cls.id}_${subj.id}`] && (
            <Section key={`${cls.id}_${subj.id}`} title={`Encode Grades: ${cls.sectionName} - ${subj.name}`}>
              <div className="overflow-x-auto">
                <table className="table w-full text-sm text-left text-gray-700">
                  <thead className="bg-gray-100 text-black sticky top-0 z-10">
                    <tr>
                      <th>Student Name</th>
                      <th>Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getStudentsForClass(cls.id).map(stu => {
                      // Compose name: Last Name, First Name Middle Name (if available)
                      const lastName = stu.lastName || stu.lastname || '';
                      const firstName = stu.firstName || stu.firstname || '';
                      const middleName = stu.middleName || stu.middlename || '';
                      const displayName = `${lastName}${lastName && firstName ? ', ' : ''}${firstName}${middleName ? ' ' + middleName : ''}`.trim() || stu.name || stu.fullName || stu.id || JSON.stringify(stu);
                      const gradeValue = grades[`${cls.id}_${subj.id}`]?.[stu.id] || '';
                      const tag = getGradeTag(gradeValue);
                      const isFinal = finalized[`${cls.id}_${subj.id}`];
                      // Permission: can encode if not finalized, or if manage permission
                      const canEncode = (!isFinal && (canManage || canView)) || (isFinal && canManage);
                      return (
                        <tr key={stu.id}>
                          <td>{displayName}</td>
                          <td className="flex items-center gap-2 min-h-[32px]">
                            <input
                              type="text"
                              className="input input-bordered w-24 bg-white border border-gray-300 text-black"
                              value={gradeValue}
                              onChange={e => handleGradeChange(cls.id, subj.id, stu.id, e.target.value)}
                              disabled={!canEncode}
                            />
                            {tag && (
                              <span
                                className={`inline-flex items-center px-2 py-1 rounded font-semibold min-w-0 whitespace-nowrap text-xs ${
                                  tag === 'Outstanding' ? 'bg-green-600 text-white' :
                                  tag === 'Very Satisfactory' ? 'bg-blue-500 text-white' :
                                  tag === 'Satisfactory' ? 'bg-yellow-400 text-white' :
                                  tag === 'Fairly Satisfactory' ? 'bg-orange-400 text-white' :
                                  'bg-red-500 text-white'
                                }`}
                              >
                                {tag}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {canManage || (!finalized[`${cls.id}_${subj.id}`] && canView) ? (
                  <div className="flex gap-4 mt-4">
                    <button
                      className="btn bg-gray-400 text-white"
                      onClick={() => handleSaveDraft(cls.id, subj.id)}
                      disabled={finalized[`${cls.id}_${subj.id}`]}
                    >
                      Save as Draft
                    </button>
                    <button
                      className="btn bg-green-600 text-white"
                      onClick={() => {
                        const key = `${cls.id}_${subj.id}`;
                        const gradeEntries = grades[key] || {};
                        const studentsForClass = getStudentsForClass(cls.id);
                        if (!areGradesValid(gradeEntries, studentsForClass)) {
                          setModal({ open: true, message: 'All grades must be filled in and valid (0-100) before finalizing.', type: 'error' });
                          return;
                        }
                        setShowConfirm(prev => ({ ...prev, [key]: true }));
                      }}
                      disabled={finalized[`${cls.id}_${subj.id}`]}
                    >
                      Save Grades
                    </button>
                  </div>
                ) : null}
                {/* Confirmation Modal */}
                {showConfirm[`${cls.id}_${subj.id}`] && (
                  <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
                    <div className="bg-white p-6 rounded shadow-lg">
                      <h3 className="text-lg font-bold mb-2">Confirm Finalization</h3>
                      <p>Are you sure you want to finalize these grades? This action <strong>CANNOT</strong> be undone.</p>
                      <div className="flex gap-4 mt-4">
                        <button className="btn bg-green-600 text-white" onClick={() => handleSaveGrades(cls.id, subj.id)}>Yes, Finalize</button>
                        <button className="btn bg-gray-400 text-black" onClick={() => setShowConfirm(prev => ({ ...prev, [`${cls.id}_${subj.id}`]: false }))}>Cancel</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Section>
          )
        ))
      ))}

      {/* Message Modal */}
      {modal.open && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-xs text-center">
            <h3 className={`text-lg font-bold mb-2 ${modal.type === 'error' ? 'text-red-600' : 'text-green-700'}`}>{modal.type === 'error' ? 'Error' : 'Success'}</h3>
            <p className="mb-4 text-black">{modal.message}</p>
            <button
              className="btn bg-blue-600 text-white w-full"
              onClick={() => setModal({ open: false, message: '', type: 'info' })}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="bg-white p-6 rounded-lg shadow-md border border-gray-300 mb-8">
      <div className="flex justify-between items-center mb-4">
        {title && <h2 className="text-xl font-bold text-black">{title}</h2>}
      </div>
      {children}
    </section>
  );
}