import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import PERMISSIONS, { hasPermission } from '../modules/Permissions';
import EncodeGrades from '../modals/EncodeGrades';

export default function ManageGrades({ permissions }) {
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);
  const [users, setUsers] = useState([]);
  const [subjectAssignments, setSubjectAssignments] = useState([]);
  const [searchClass, setSearchClass] = useState('');
  const [currentUserId, setCurrentUserId] = useState('');
  const [activeGradeModal, setActiveGradeModal] = useState(null);

  const canManage = hasPermission(permissions, PERMISSIONS.MANAGE_GRADES);
  const canView = hasPermission(permissions, PERMISSIONS.ENCODE_GRADES);

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
  }, []);

  useEffect(() => {
    const employeeId = localStorage.getItem('employeeId') || '';
    const assignment = subjectAssignments.find(sa => sa.teacherEmployeeId === employeeId);
    if (assignment) {
      setCurrentUserId(assignment.teacherId || '');
    }
  }, [subjectAssignments]);

  const filteredSubjectAssignments = subjectAssignments.filter(sa => sa.teacherId === currentUserId);
  const classesWithSubjects = classes.filter(cls =>
    filteredSubjectAssignments.some(sa => sa.classId === cls.id)
  );

  const getSubjectAssignmentsForClass = (classId) =>
    filteredSubjectAssignments.filter(sa => sa.classId === classId);

  const getTeacherName = (teacherId) =>
    users.find(u => u.id === teacherId)?.name || '-';

  if (!canManage && !canView) {
    return (
      <Section title="Access Denied">
        <p className="text-red-500">You do not have permission to view grades.</p>
      </Section>
    );
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
                .filter(cls => cls.sectionName?.toLowerCase().includes(searchClass.toLowerCase()))
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
                                onClick={() =>
                                  setActiveGradeModal({
                                    classId: cls.id,
                                    subjectId: sa.subjectId,
                                    sectionName: cls.sectionName,
                                    subjectName: subj.name,
                                  })
                                }
                              >
                                Encode
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

      {activeGradeModal && (
        <EncodeGrades
          isOpen={!!activeGradeModal}
          onClose={() => setActiveGradeModal(null)}
          classId={activeGradeModal.classId}
          subjectId={activeGradeModal.subjectId}
          sectionName={activeGradeModal.sectionName}
          subjectName={activeGradeModal.subjectName}
          students={students}
          permissions={permissions}
        />
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