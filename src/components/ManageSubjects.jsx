import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, getDocs, deleteDoc, doc, updateDoc, addDoc } from 'firebase/firestore';
import PERMISSIONS, { hasPermission } from '../modules/Permissions';

export default function ManageSubjects({ permissions }) {
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [users, setUsers] = useState([]);
  const [searchSubject, setSearchSubject] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editData, setEditData] = useState(null);
  const [refresh, setRefresh] = useState(false);
  const [actionSubjectId, setActionSubjectId] = useState(null);
  const [dropUp, setDropUp] = useState(false);
  const buttonRefs = useRef({});
  const [currentUserId, setCurrentUserId] = useState('');
  const [currentUserEmail, setCurrentUserEmail] = useState('');

  // Modal form state
  const [subjectName, setSubjectName] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [selectedClass, setSelectedClass] = useState('');

  useEffect(() => {
    const fetchSubjects = async () => {
      const snapshot = await getDocs(collection(db, 'subjects'));
      setSubjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), status: doc.data().status || 'active' })));
    };
    fetchSubjects();
  }, [refresh]);

  useEffect(() => {
    const fetchClasses = async () => {
      const snapshot = await getDocs(collection(db, 'classes'));
      setClasses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchClasses();
  }, []);

  useEffect(() => {
    const fetchUsers = async () => {
      const snapshot = await getDocs(collection(db, 'users'));
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    const empId = localStorage.getItem('employeeId') || '';
    // Find the Firestore user id based on employeeId
    const user = users.find(u => u.employeeId === empId);
    setCurrentUserId(user ? user.id : '');
    setCurrentUserEmail(user ? (user.email || '') : '');
  }, [users]);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this subject?')) {
      await deleteDoc(doc(db, 'subjects', id));
      setRefresh(r => !r);
    }
  };

  const handleEdit = (subject) => {
    setEditData(subject);
    setSubjectName(subject.name);
    setSelectedTeacher(subject.teacherId);
    setSelectedClass(subject.classId);
    setShowModal(true);
  };

  const handleToggleStatus = async (subject) => {
    const subjectRef = doc(db, 'subjects', subject.id);
    const newStatus = subject.status === 'archived' ? 'active' : 'archived';
    await updateDoc(subjectRef, { status: newStatus });
    setRefresh(r => !r);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subjectName || !selectedTeacher || !selectedClass) return;
    if (editData) {
      // Update
      await updateDoc(doc(db, 'subjects', editData.id), {
        name: subjectName,
        teacherId: selectedTeacher,
        classId: selectedClass,
      });
    } else {
      // Add
      await addDoc(collection(db, 'subjects'), {
        name: subjectName,
        teacherId: selectedTeacher,
        classId: selectedClass,
        status: 'active',
      });
    }
    setShowModal(false);
    setEditData(null);
    setSubjectName('');
    setSelectedTeacher('');
    setSelectedClass('');
    setRefresh(r => !r);
  };

  const toggleDropdown = (id) => {
    if (actionSubjectId === id) {
      setActionSubjectId(null);
      return;
    }
    const button = buttonRefs.current[id];
    if (button) {
      const rect = button.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setDropUp(spaceBelow < 120);
    }
    setActionSubjectId(id);
  };

  // Permission helpers
  const canManage = hasPermission(permissions, PERMISSIONS.MANAGE_SUBJECTS);
  const canView = hasPermission(permissions, PERMISSIONS.VIEW_SUBJECTS);
  if (!canManage && !canView) {
    return (
      <Section title="Access Denied">
        <p className="text-red-500">You do not have permission to view subjects.</p>
      </Section>
    );
  }
  const isViewOnly = canView && !canManage;

  // Filter subjects for view-only users: only show subjects where teacherId matches current user
  const filteredSubjects = isViewOnly
    ? subjects.filter(subj => subj.teacherId === currentUserId)
    : subjects;

  return (
    <div>
      <Section title="Manage Subjects">
        {!isViewOnly && (
          <button
            className="btn bg-blue-600 text-white"
            onClick={() => {
              setEditData(null);
              setSubjectName('');
              setSelectedTeacher('');
              setSelectedClass('');
              setShowModal(true);
            }}
          >
            Add Subject
          </button>
        )}
      </Section>

      <Section>
        <div className="w-full flex flex-col space-y-4">
          <input
            type="text"
            placeholder="Search by Subject, Teacher, or Class"
            className="input input-bordered w-full bg-white border border-gray-300 text-black"
            value={searchSubject}
            onChange={(e) => setSearchSubject(e.target.value)}
          />

          <div className="h-[350px] overflow-y-auto border rounded shadow">
            <table className="table w-full text-sm text-left text-gray-700">
              <thead className="bg-gray-100 text-black sticky top-0 z-10">
                <tr>
                  <th>Subject Name</th>
                  <th>Teacher</th>
                  <th>Class</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubjects
                  .filter(subj => subj.status !== 'archived')
                  .filter(subj => {
                    const teacher = users.find(u => u.id === subj.teacherId)?.name || '';
                    const className = classes.find(c => c.id === subj.classId)?.sectionName || '';
                    return (
                      subj.name?.toLowerCase().includes(searchSubject.toLowerCase()) ||
                      teacher.toLowerCase().includes(searchSubject.toLowerCase()) ||
                      className.toLowerCase().includes(searchSubject.toLowerCase())
                    );
                  })
                  .map(subj => {
                    const teacher = users.find(u => u.id === subj.teacherId)?.name || '-';
                    const className = classes.find(c => c.id === subj.classId)?.sectionName || '-';
                    return (
                      <tr key={subj.id} className={`${actionSubjectId === subj.id ? 'bg-blue-200 text-black' : 'hover:bg-blue-100 hover:text-black'}`}>
                        <td>{subj.name}</td>
                        <td>{teacher}</td>
                        <td>{className}</td>
                        <td>
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${subj.status === 'archived' ? 'bg-gray-400 text-white' : 'bg-green-500 text-white'}`}>
                            {subj.status === 'archived' ? 'Archived' : 'Active'}
                          </span>
                        </td>
                        <td className="relative">
                          <button
                            ref={el => (buttonRefs.current[subj.id] = el)}
                            onClick={() => toggleDropdown(subj.id)}
                            className="text-xl px-2 py-1 rounded"
                          >
                            ⋮
                          </button>
                          {actionSubjectId === subj.id && (
                            <div
                              className={`absolute ${dropUp ? 'bottom-full mb-2' : 'mt-2'} right-0 w-32 bg-white border rounded shadow-md z-10`}
                            >
                              {!isViewOnly && (
                                <>
                                  <button
                                    onClick={() => { handleEdit(subj); setActionSubjectId(null); }}
                                    className="block w-full px-4 py-2 text-left hover:bg-gray-100"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => { handleDelete(subj.id); setActionSubjectId(null); }}
                                    className="block w-full px-4 py-2 text-left text-red-600 hover:bg-red-100"
                                  >
                                    Delete
                                  </button>
                                  <button
                                    onClick={() => { handleToggleStatus(subj); setActionSubjectId(null); }}
                                    className={`block w-full px-4 py-2 text-left ${subj.status === 'archived' ? 'text-green-700 hover:bg-green-100' : 'text-gray-700 hover:bg-gray-100'}`}
                                  >
                                    {subj.status === 'archived' ? 'Mark as Active' : 'Archive'}
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      </Section>

      {/* Archived Subjects Section */}
      <Section title="Archived Subjects">
        {Object.entries(
          filteredSubjects.filter(subj => subj.status === 'archived')
            .reduce((acc, subj) => {
              const className = classes.find(c => c.id === subj.classId)?.sectionName || 'Unknown Class';
              if (!acc[className]) acc[className] = [];
              acc[className].push(subj);
              return acc;
            }, {})
        ).length === 0 ? (
          <div className="text-gray-500">No archived subjects.</div>
        ) : (
          Object.entries(
            filteredSubjects.filter(subj => subj.status === 'archived')
              .reduce((acc, subj) => {
                const className = classes.find(c => c.id === subj.classId)?.sectionName || 'Unknown Class';
                if (!acc[className]) acc[className] = [];
                acc[className].push(subj);
                return acc;
              }, {})
          ).map(([className, archivedSubjects]) => (
            <div key={className} className="mb-6">
              <h3 className="font-bold text-md mb-2">{className}</h3>
              <div className="flex flex-wrap gap-2">
                {archivedSubjects.map(subj => (
                  <div
                    key={subj.id}
                    className="px-4 py-2 rounded bg-gray-200 text-black shadow text-sm flex items-center gap-2"
                  >
                    <span className="font-semibold">{subj.name}</span>
                    <span className="text-xs text-gray-600">({users.find(u => u.id === subj.teacherId)?.name || '-'})</span>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </Section>

      {/* Add/Edit Subject Modal */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">{editData ? 'Edit Subject' : 'Add Subject'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block mb-1 font-semibold">Subject Name</label>
                <input
                  type="text"
                  className="input input-bordered w-full bg-white border border-gray-300 text-black"
                  value={subjectName}
                  onChange={e => setSubjectName(e.target.value)}
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block mb-1 font-semibold">Assign Teacher</label>
                <select
                  className="input input-bordered w-full bg-white border border-gray-300 text-black"
                  value={selectedTeacher}
                  onChange={e => setSelectedTeacher(e.target.value)}
                  required
                >
                  <option value="">Select Teacher</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>{user.name}</option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block mb-1 font-semibold">Assign to Class</label>
                <select
                  className="input input-bordered w-full bg-white border border-gray-300 text-black"
                  value={selectedClass}
                  onChange={e => setSelectedClass(e.target.value)}
                  required
                >
                  <option value="">Select Class</option>
                  {classes.map(cls => (
                    <option key={cls.id} value={cls.id}>{cls.sectionName}</option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="mt-4 btn bg-blue-600 text-white w-full"
              >
                {editData ? 'Update Subject' : 'Add Subject'}
              </button>
              <button
                type="button"
                className="mt-2 btn bg-gray-400 text-white w-full"
                onClick={() => { setShowModal(false); setEditData(null); }}
              >
                Cancel
              </button>
            </form>
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
        {children}
      </div>
    </section>
  );
}