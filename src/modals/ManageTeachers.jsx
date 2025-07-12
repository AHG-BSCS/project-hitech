import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import {
  collection,
  doc,
  setDoc,
  onSnapshot,
  deleteDoc,
  getDoc,
} from 'firebase/firestore';

export default function ManageTeachersModal({ open, onClose, classId }) {
  const [subjects, setSubjects] = useState([]);
  const [allSubjects, setAllSubjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchQueries, setSearchQueries] = useState({});
  const [searchResults, setSearchResults] = useState({});
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [removedSubjectIds, setRemovedSubjectIds] = useState([]);
  const [classMeta, setClassMeta] = useState(null);

  useEffect(() => {
    if (!open || !classId) return;
  
    let unsubscribeSubjects;
    let unsubscribeUsers;
    let unsubscribeAssignments;
  
    const initialize = async () => {
      setSubjects([]);
      setAssignments([]);
      setMessage('');
      setSearchQueries({});
      setSearchResults({});
      setRemovedSubjectIds([]);
      setSelectedSubjectId('');
      setClassMeta(null);
  
      const classRef = doc(db, 'classes', classId);
      const classSnap = await getDoc(classRef);
      if (!classSnap.exists()) {
        setMessage('❌ Class not found');
        return;
      }
  
      const classData = classSnap.data();
      const { gradeLevel, sectionName, schoolYear } = classData;
      setClassMeta({ gradeLevel, sectionName, schoolYear });
  
      let subjectsData = [];
      let usersData = [];
  
      const loadAssignments = (loadedSubjects) => {
        unsubscribeAssignments = onSnapshot(
          collection(db, 'subjectAssignments'),
          (snapshot) => {
            const allAssignments = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }));
  
            const filtered = allAssignments.filter(
              (a) =>
                a.gradeLevel === gradeLevel &&
                a.sectionName === sectionName &&
                a.schoolYear === schoolYear
            );
  
            const finalSubjects = [];
            const finalAssignments = [];
  
            for (const a of filtered) {
              const subject = loadedSubjects.find((s) => s.id === a.subjectId);
              if (subject) {
                finalSubjects.push(subject);
                finalAssignments.push({
                  subjectId: subject.id,
                  teacher: {
                    id: a.teacherId,
                    name: a.teacherName,
                    employeeId: a.teacherEmployeeId,
                  },
                });
              }
            }
  
            setSubjects(finalSubjects);
            setAssignments(finalAssignments);
          }
        );
      };
  
      unsubscribeSubjects = onSnapshot(collection(db, 'subjects'), (snapshot) => {
        subjectsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setAllSubjects(subjectsData);
        loadAssignments(subjectsData); 
      });
  
      unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
        usersData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setUsers(usersData);
      });
    };
  
    initialize();
  
    return () => {
      unsubscribeSubjects?.();
      unsubscribeUsers?.();
      unsubscribeAssignments?.();
    };
  }, [open, classId]);  

  const handleAddSubject = () => {
    const subject = allSubjects.find(s => s.id === selectedSubjectId);
    if (!subject) return;

    const alreadyAdded = subjects.find(s => s.id === subject.id);
    if (!alreadyAdded) {
      setSubjects(prev => [...prev, subject]);
      setAssignments(prev => [...prev, { subjectId: subject.id, teacher: null }]);
    }
  };

  const handleRemoveSubject = (subjectId) => {
    setSubjects(prev => prev.filter(s => s.id !== subjectId));
    setAssignments(prev => prev.filter(a => a.subjectId !== subjectId));
    setRemovedSubjectIds(prev => [...prev, subjectId]);
  
    setSearchQueries(prev => {
      const { [subjectId]: _, ...rest } = prev;
      return rest;
    });
  
    setSearchResults(prev => {
      const { [subjectId]: _, ...rest } = prev;
      return rest;
    });
  };  

  const handleSearchChange = (subjectId, value) => {
    setSearchQueries(prev => ({ ...prev, [subjectId]: value }));
    if (value.trim().length < 2) {
      setSearchResults(prev => ({ ...prev, [subjectId]: [] }));
      return;
    }

    const filtered = users.filter(user =>
      user.name?.toLowerCase().includes(value.toLowerCase()) ||
      user.employeeId?.toLowerCase().includes(value.toLowerCase())
    );
    setSearchResults(prev => ({ ...prev, [subjectId]: filtered }));
  };

  const assignTeacher = (subjectId, teacher) => {
    setAssignments(prev =>
      prev.map(a =>
        a.subjectId === subjectId ? { ...a, teacher } : a
      )
    );
    setSearchQueries(prev => ({ ...prev, [subjectId]: '' }));
    setSearchResults(prev => ({ ...prev, [subjectId]: [] }));
  };

  const handleSave = async () => {
    try {
      setLoading(true);

      if (!classMeta) return;

      const { gradeLevel, sectionName, schoolYear } = classMeta;

      for (let subjectId of removedSubjectIds) {
        const docRef = doc(
          db,
          'subjectAssignments',
          `${gradeLevel}_${sectionName}_${schoolYear}_${subjectId}`
        );
        await deleteDoc(docRef);
      }
  
      for (let assign of assignments) {
        if (assign.teacher) {
          if (!gradeLevel || !schoolYear || !sectionName) {
            console.error('gradeLevel, sectionName, or schoolYear is missing');
            setMessage('❌ gradeLevel, sectionName, or schoolYear is not defined.');
            return;
          }
  
          const docRef = doc(
            db,
            'subjectAssignments',
            `${gradeLevel}_${sectionName}_${schoolYear}_${assign.subjectId}`
          );
  
          await setDoc(docRef, {
            classId,
            subjectId: assign.subjectId,
            gradeLevel,
            sectionName,
            schoolYear,
            teacherId: assign.teacher.id,
            teacherName: assign.teacher.name,
            teacherEmployeeId: assign.teacher.employeeId,
          }, { merge: true });
        }
      }
      setRemovedSubjectIds([]);
      setMessage('✅ Assignments saved!');
      onClose();
    } catch (err) {
      console.error(err);
      setMessage('❌ Failed to save assignments.');
    } finally {
      setLoading(false);
    }
  };  

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg shadow-md p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className='sticky top-0 z-10 bg-white h-[100px]'>
          <h2 className="text-xl font-bold text-black mb-4">
            Manage Teachers for {classMeta?.gradeLevel} - {classMeta?.sectionName} ({classMeta?.schoolYear})
          </h2>
          <div className="flex items-center gap-3 mb-4">
            <select
              className="select select-bordered w-full border border-gray-300 bg-white text-black"
              value={selectedSubjectId}
              onChange={e => setSelectedSubjectId(e.target.value)}
            >
              <option value="">Select Subject</option>
              {allSubjects
                .filter(subject => !subjects.find(s => s.id === subject.id))
                .map(subject => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
              ))}
            </select>
            <button
              onClick={handleAddSubject}
              className="btn bg-blue-500 hover:bg-blue-600 text-white"
              disabled={!selectedSubjectId}
            >
              + Add Subject
            </button>
          </div>
        </div>
        <div className="space-y-4">
          {subjects.map((subject) => {
            const teacher = assignments.find(a => a.subjectId === subject.id)?.teacher;
            const query = searchQueries[subject.id] || '';
            const results = searchResults[subject.id] || [];

            return (
              <div key={subject.id} className="border p-3 rounded bg-gray-50">
                <div className="flex justify-between items-center mb-2">
                  <div className="font-semibold text-black">{subject.name}</div>
                  <button
                    onClick={() => handleRemoveSubject(subject.id)}
                    className="text-red-600 hover:underline text-sm"
                  >
                    ✕ Remove
                  </button>
                </div>

                {teacher ? (
                  <div className="text-green-700 text-sm">
                    Assigned to: {teacher.name} ({teacher.employeeId})
                  </div>
                ) : (
                  <div className="mt-2">
                    <input
                      type="text"
                      placeholder="Search by name or employee ID"
                      className="input input-bordered w-full bg-white border border-gray-300 text-black"
                      value={query}
                      onChange={e => handleSearchChange(subject.id, e.target.value)}
                    />
                    {results.length > 0 && (
                      <ul className="bg-white text-black border mt-1 rounded shadow max-h-40 overflow-y-auto z-50 relative">
                        {results.map(user => (
                          <li
                            key={user.id}
                            className="p-2 hover:bg-gray-100 cursor-pointer"
                            onClick={() => assignTeacher(subject.id, user)}
                          >
                            {user.name} ({user.employeeId})
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {message && (
          <p className={`mt-4 text-sm ${message.startsWith('✅') ? 'text-green-600' : 'text-red-500'}`}>
            {message}
          </p>
        )}

        <div className="flex justify-end mt-6 space-x-2">
          <button onClick={onClose} className="btn bg-gray-300 hover:bg-gray-400 text-black">Close</button>
          <button onClick={handleSave} className="btn bg-blue-500 hover:bg-blue-600 text-white">
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}