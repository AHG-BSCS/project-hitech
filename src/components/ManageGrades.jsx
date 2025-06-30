  import React, { useState, useEffect, useRef } from 'react';
  import { db } from '../firebase';
  import { collection, getDocs, deleteDoc, doc, updateDoc, addDoc, setDoc } from 'firebase/firestore';
  import PERMISSIONS, { hasPermission } from '../modules/Permissions';

  export default function ManageGrades({ permissions }) {
    const [classes, setClasses] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [students, setStudents] = useState([]);
    const [users, setUsers] = useState([]);
    const [grades, setGrades] = useState({});
    const [refresh, setRefresh] = useState(false);
    const [searchClass, setSearchClass] = useState('');
    const [showGradeTable, setShowGradeTable] = useState({});
    const [finalized, setFinalized] = useState({});
    const [showConfirm, setShowConfirm] = useState({});
    const [modal, setModal] = useState({ open: false, message: '', type: 'info' });
    const [subjectAssignments, setSubjectAssignments] = useState([]);
    const [currentUserId, setCurrentUserId] = useState('');
    
    useEffect(() => {
      const fetchData = async () => {
        const [classSnap, subjectSnap, studentSnap, userSnap, subjectAssignSnap] = await Promise.all([
          getDocs(collection(db, 'classes')),
          getDocs(collection(db, 'subjects')),
          getDocs(collection(db, 'students')),
          getDocs(collection(db, 'users')),
          getDocs(collection(db, 'subjectAssignments')),
        ]);
        setClasses(classSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setSubjects(subjectSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setStudents(studentSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setUsers(userSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setSubjectAssignments(subjectAssignSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      };    
      fetchData();
    }, [refresh]);

    useEffect(() => {
      const fetchSubjectAssignments = async () => {
        const snapshot = await getDocs(collection(db, 'subjectAssignments'));
        setSubjectAssignments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      };
      fetchSubjectAssignments();
    }, []); 

    useEffect(() => {
      const employeeId = localStorage.getItem('employeeId') || '';
      const assignment = subjectAssignments.find(sa => sa.teacherEmployeeId === employeeId);
      if (assignment) {
        setCurrentUserId(assignment.teacherId || '');
      } else {
        setCurrentUserId('');
      }
    }, [subjectAssignments]);  

    console.log(subjects.filter(subj => subj.teacherId));

    const filteredSubjectAssignments = subjectAssignments.filter(sa => sa.teacherId === currentUserId);

    const classesWithSubjects = classes.filter(cls =>
      filteredSubjectAssignments.some(sa => sa.classId === cls.id)
    );
    
    const getSubjectAssignmentsForClass = (classId) =>
      filteredSubjectAssignments.filter(sa => sa.classId === classId);
    
    const getStudentsForClass = (classId) =>
      students.filter(stu => {
        if (Array.isArray(stu.classId)) {
          return stu.classId.includes(classId);
        }
        if (stu.class_id && Array.isArray(stu.class_id)) {
          return stu.class_id.includes(classId);
        }
        if (stu.class_id) {
          return stu.class_id === classId;
        }
        return stu.classId === classId;
      });

    const getTeacherName = (teacherId) =>
      users.find(u => u.id === teacherId)?.name || '-';

    const fetchGrades = async (classId, subjectId) => {
      const gradesSnap = await getDocs(collection(db, 'grades'));
      const gradeData = {};
      let isFinal = false;
    
      gradesSnap.docs.forEach(docu => {
        const data = docu.data();
      
        if (data.classId === classId && data.subjectId === subjectId) {
          gradeData[data.studentId] = {
            q1: {
              grade: data.q1?.grade ?? '',
              finalized: data.q1?.finalized ?? false
            },
            q2: {
              grade: data.q2?.grade ?? '',
              finalized: data.q2?.finalized ?? false
            },
            q3: {
              grade: data.q3?.grade ?? '',
              finalized: data.q3?.finalized ?? false
            },
            q4: {
              grade: data.q4?.grade ?? '',
              finalized: data.q4?.finalized ?? false
            }
          };
        }
      });      
    
      setGrades(prev => ({ ...prev, [`${classId}_${subjectId}`]: gradeData }));
      setFinalized(prev => ({ ...prev, [`${classId}_${subjectId}`]: isFinal }));
    };  

    const saveGrades = async (classId, subjectId, gradesObj, finalized = false) => {
      const batchPromises = [];
    
      for (const studentId in gradesObj) {
        const studentGrades = gradesObj[studentId];
    
        const docRef = doc(db, 'grades', `${classId}_${subjectId}_${studentId}`);
        const docData = {
          classId,
          subjectId,
          studentId,
          q1: {
            grade: studentGrades.q1?.grade ?? '',
            finalized: studentGrades.q1?.finalized ?? false,
          },
          q2: {
            grade: studentGrades.q2?.grade ?? '',
            finalized: studentGrades.q2?.finalized ?? false,
          },
          q3: {
            grade: studentGrades.q3?.grade ?? '',
            finalized: studentGrades.q3?.finalized ?? false,
          },
          q4: {
            grade: studentGrades.q4?.grade ?? '',
            finalized: studentGrades.q4?.finalized ?? false,
          },
        };        
    
        batchPromises.push(setDoc(docRef, docData, { merge: true }));
      }
    
      try {
        await Promise.all(batchPromises);
        console.log('Grades saved successfully');
      } catch (error) {
        console.error('Error saving grades:', error);
      }
    };

    const handleGradeChange = (classId, subjectId, studentId, quarter, value) => {
      const key = `${classId}_${subjectId}`;
      setGrades(prev => ({
        ...prev,
        [key]: {
          ...prev[key],
          [studentId]: {
            ...prev[key]?.[studentId],
            [quarter]: {
              ...(prev[key]?.[studentId]?.[quarter] || {}),
              grade: value
            }
          }
        }
      }));
    };
    
    const handleToggleFinalized = (classId, subjectId, studentId, quarter) => {
      const key = `${classId}_${subjectId}`;
      const current = grades[key]?.[studentId]?.[quarter]?.finalized ?? false;
      setGrades(prev => ({
        ...prev,
        [key]: {
          ...prev[key],
          [studentId]: {
            ...prev[key]?.[studentId],
            [quarter]: {
              ...(prev[key]?.[studentId]?.[quarter] || {}),
              finalized: !current
            }
          }
        }
      }));
    };

    function initializeGrades(students, classId, subjectId) {
      const initialData = {};
    
      students.forEach((student) => {
        const studentId = student.id;
    
        if (!initialData[classId]) initialData[classId] = {};
        if (!initialData[classId][subjectId]) initialData[classId][subjectId] = {};
        if (!initialData[classId][subjectId][studentId]) {
          initialData[classId][subjectId][studentId] = {
            q1: { grade: '', finalized: false },
            q2: { grade: '', finalized: false },
            q3: { grade: '', finalized: false },
            q4: { grade: '', finalized: false },
          };
        }
      });
    
      return initialData;
    }    

    function areGradesValid(gradeEntries, students) {
      for (let student of students) {
        const entry = gradeEntries[student.id];
        if (!entry) continue;
    
        for (let q of ['q1', 'q2', 'q3', 'q4']) {
          const val = entry[q];
          if (val === '' || val === undefined || val === null) continue;
    
          const num = Number(val);
          if (isNaN(num) || num < 0 || num > 100) {
            return false;
          }
        }
      }
    
      return true;
    } 
    
    function migrateGradeEntries(oldEntries) {
      const newEntries = {};
      const quarters = ['q1', 'q2', 'q3', 'q4'];
    
      for (const studentId in oldEntries) {
        const oldEntry = oldEntries[studentId];
        const newEntry = {};
    
        for (const q of quarters) {
          const grade = oldEntry[q] !== undefined ? oldEntry[q] : '';
          newEntry[q] = {
            grade: grade,
            finalized: false
          };
        }
    
        newEntries[studentId] = newEntry;
      }
    
      return newEntries;
    }
    

    function areDraftGradesValid(gradeEntries, students) {
      if (!students.length) return false;
      for (const stu of students) {
        const entry = gradeEntries[stu.id];
        if (!entry) continue;
        for (let q of ['q1', 'q2', 'q3', 'q4']) {
          const val = entry[q];
          if (val === undefined || val === null || val === '') continue;
          const num = Number(val);
          if (isNaN(num) || num < 0 || num > 100) return false;
        }
      }
      return true;
    }

    const handleSaveDraft = async (classId, subjectId) => {
      const key = `${classId}_${subjectId}`;
      const gradeEntries = grades[key] || {};
      const studentsForClass = getStudentsForClass(classId);
    
      if (!areGradesValid(gradeEntries, studentsForClass)) {
        setModal({ open: true, message: 'Some entered grades are invalid. Please ensure all filled grades are between 0 and 100.', type: 'error' });
        return;
      }    
    
      for (const stu of studentsForClass) {
        const entry = gradeEntries[stu.id];
        if (!entry) continue;
    
        const docId = `${classId}_${subjectId}_${stu.id}`;
        await setDoc(doc(db, 'grades', docId), {
          classId,
          subjectId,
          studentId: stu.id,
          q1: entry.q1 || '',
          q2: entry.q2 || '',
          q3: entry.q3 || '',
          q4: entry.q4 || '',
          finalized: false
        });
      }
    
      setRefresh(r => !r);
      setModal({ open: true, message: 'Draft saved!', type: 'success' });
    };
    
    const handleSaveGrades = async (classId, subjectId) => {
      const key = `${classId}_${subjectId}`;
      const gradeEntries = grades[key] || {};
      const studentsForClass = getStudentsForClass(classId);
    
      for (const student of studentsForClass) {
        const entry = gradeEntries[student.id];
        if (!entry) continue;
    
        for (const q of ['q1', 'q2', 'q3', 'q4']) {
          const isFinal = entry[q]?.finalized;
          const grade = entry[q]?.grade;
          if (isFinal && (grade === '' || grade === undefined || grade === null)) {
            setModal({
              open: true,
              type: 'error',
              message: `Cannot finalize ${q.toUpperCase()} grade for ${student.lastName}, ${student.firstName} without a grade.`,
            });
            return;
          }
        }
      }
    
      await saveGrades(classId, subjectId, gradeEntries, true);
      setFinalized(prev => ({ ...prev, [key]: true }));
      setShowConfirm(prev => ({ ...prev, [key]: false }));
      setModal({ open: true, message: 'Grades finalized successfully!', type: 'success' });
    };        

    const canManage = hasPermission(permissions, PERMISSIONS.MANAGE_GRADES);
    const canView = hasPermission(permissions, PERMISSIONS.ENCODE_GRADES);
    if (!canManage && !canView) {
      return (
        <Section title="Access Denied">
          <p className="text-red-500">You do not have permission to view grades.</p>
        </Section>
      );
    }

    function getGradeTag(grade) {
      if (grade === '' || grade === undefined || grade === null) return '';
      const num = Number(grade);
      if (isNaN(num)) return '';
      if (num >= 90 && num <= 100) return 'Outstanding';
      if (num >= 85 && num <= 89) return 'Very Satisfactory';
      if (num >= 80 && num <= 84) return 'Satisfactory';
      if (num >= 75 && num <= 78) return 'Fairly Satisfactory';
      if (num < 75) return 'Failed';
      if (num < 0 || num > 100) return 'Invalid';
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
            <table className="table w-full text-sm text-left border border-gray text-gray-700">
              <thead className="bg-gray-100 text-black sticky top-0 z-10">
                <tr>
                  <th>Class</th>
                  <th>Subjects</th>
                </tr>
              </thead>
              <tbody>
                {classesWithSubjects
                  .filter(cls =>
                    cls.sectionName?.toLowerCase().includes(searchClass.toLowerCase())
                  )
                  .map(cls => (
                    <tr key={cls.id} className='border border-gray-300'>
                    <td>{cls.sectionName}</td>
                    <td>
                      <div className="flex flex-col gap-4">
                        {getSubjectAssignmentsForClass(cls.id).map(sa => {
                          const subj = subjects.find(s => s.id === sa.subjectId) || { name: 'Unknown' };
                          return (
                            <div
                              key={sa.id}
                              className="flex items-center justify-between gap-2 bg-gray-100 px-2 py-1 rounded"
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-semibold">{subj.name}</span>
                                <span className="text-xs text-gray-500">({getTeacherName(sa.teacherId)})</span>
                              </div>

                              <button
                                className="btn btn-xs bg-blue-600 text-white"
                                onClick={async () => {
                                  const key = `${cls.id}_${sa.subjectId}`;
                                  setShowGradeTable(prev => ({ ...prev, [key]: !prev[key] }));
                                  if (!grades[key]) await fetchGrades(cls.id, sa.subjectId);
                                }}
                              >
                                {showGradeTable[`${cls.id}_${sa.subjectId}`] ? 'Hide' : 'Encode'}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* Grade Encoding Tables */}
        {classesWithSubjects.map(cls =>
          getSubjectAssignmentsForClass(cls.id).map(sa => {
            const key = `${cls.id}_${sa.subjectId}`;
            if (!showGradeTable[key]) return null;

            const subj = subjects.find(s => s.id === sa.subjectId) || { name: 'Unknown' };

            return (
              <Section key={key} title={`Encode Grades: ${cls.sectionName} - ${subj.name}`}>
                <div className="overflow-x-auto">
                  <table className="table w-full text-sm text-left text-gray-700">
                  <thead className="bg-gray-100 text-black sticky top-0 z-10">
                    <tr>
                      <th>Student Name</th>
                      <th colSpan={4}>Quarterly Grades</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getStudentsForClass(cls.id).map(stu => {
                      const lastName = stu.lastName || stu.lastname || '';
                      const firstName = stu.firstName || stu.firstname || '';
                      const middleName = stu.middleName || stu.middlename || '';
                      const displayName = `${lastName}${lastName && firstName ? ', ' : ''}${firstName}${middleName ? ' ' + middleName : ''}`.trim() || stu.name || stu.fullName || stu.id || JSON.stringify(stu);
                      const entry = grades[key]?.[stu.id] || {};
                      const isFinal = finalized[key];
                      const canEncode = (!isFinal && (canManage || canView)) || (isFinal && canManage);

                      return (
                        <tr key={stu.id}>
                          <td>{displayName}</td>
                          <td colSpan={4}>
                            <div className="flex gap-2">
                            {['q1', 'q2', 'q3', 'q4'].map(q => {
                              const val = entry[q]?.grade || '';
                              const tag = getGradeTag(val);
                              return (
                                <div key={q} className="flex flex-col items-start mr-2">
                                  <input
                                    type="text"
                                    className="input input-bordered w-24 bg-white border border-gray-300 text-black"
                                    value={val}
                                    onChange={e => handleGradeChange(cls.id, sa.subjectId, stu.id, q, e.target.value)}
                                    disabled={!canEncode || (entry[q]?.finalized ?? false)}
                                    placeholder={q.toUpperCase()}
                                  />
                                  <div className="flex items-center mt-1">
                                    <input
                                      type="checkbox"
                                      className="mr-1"
                                      checked={entry[q]?.finalized || false}
                                      onChange={() => handleToggleFinalized(cls.id, sa.subjectId, stu.id, q)}
                                      disabled={!canEncode}
                                    />
                                    <span className="text-xs text-gray-500">Finalized</span>
                                  </div>
                                  {tag && (
                                    <span className="text-xs text-gray-500 mt-1">{tag}</span>
                                  )}
                                </div>
                              );
                            })}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  </table>
                  {(canManage || (!finalized[key] && canView)) && (
                    <div className="flex gap-4 mt-4">
                      <button
                        className="btn !bg-green-600 !text-white"
                        onClick={() => handleSaveGrades(cls.id, sa.subjectId)}
                        disabled={finalized[key]}
                      >
                        Save Grades
                      </button>
                    </div>
                  )}
                  {showConfirm[key] && (
                    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
                      <div className="bg-white p-6 rounded shadow-lg">
                        <h3 className="text-lg text-black font-bold mb-2">Confirm Finalization</h3>
                        <p className='text-black'>Are you sure you want to finalize these grades? This action <strong>CANNOT</strong> be undone.</p>
                        <div className="flex gap-4 mt-4">
                          <button className="btn bg-green-600 text-white" onClick={() => handleSaveGrades(cls.id, sa.subjectId)}>Yes, Finalize</button>
                          <button className="btn bg-gray-400 text-black" onClick={() => setShowConfirm(prev => ({ ...prev, [key]: false }))}>Cancel</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </Section>
            );
          })
        )}

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