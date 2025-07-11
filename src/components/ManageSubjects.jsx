import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, deleteDoc, doc, updateDoc, addDoc } from 'firebase/firestore';
import PERMISSIONS, { hasPermission } from '../modules/Permissions';
import { usePermissions } from '../context/PermissionsContext';

export default function ManageSubjects() {
  const [subjects, setSubjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [searchSubject, setSearchSubject] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editData, setEditData] = useState(null);
  const [refresh, setRefresh] = useState(false);
  const [actionSubjectId, setActionSubjectId] = useState(null);
  const [dropUp, setDropUp] = useState(false);
  const buttonRefs = useRef({});
  const dropdownRef = useRef(null); // NEW: ref for dropdown
  const [currentUserId, setCurrentUserId] = useState('');
  const [currentUserEmail, setCurrentUserEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const { permissions } = usePermissions();

  // Modal form state
  const [subjectName, setSubjectName] = useState('');

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'subjects'), (snapshot) => {
      setSubjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  
    return () => unsubscribe();
  }, []);  

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  
    return () => unsubscribe();
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
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subjectName) return;
    if (editData) {
      // Update
      await updateDoc(doc(db, 'subjects', editData.id), {
        name: subjectName,
      });
    } else {
      // Add
      await addDoc(collection(db, 'subjects'), {
        name: subjectName,
      });
    }
    setShowModal(false);
    setEditData(null);
    setSubjectName('');
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

  // Add effect to close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (actionSubjectId !== null) {
        const button = buttonRefs.current[actionSubjectId];
        const dropdown = dropdownRef.current;
        if (
          button && !button.contains(event.target) &&
          dropdown && !dropdown.contains(event.target)
        ) {
          setActionSubjectId(null);
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [actionSubjectId]);

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
            className="btn bg-blue-600 text-white w-[150px] text-center"
            onClick={() => {
              setEditData(null);
              setSubjectName('');
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
            placeholder="Search by Subject Name"
            className="input input-bordered w-full bg-white border border-gray-300 text-black"
            value={searchSubject}
            onChange={(e) => setSearchSubject(e.target.value)}
          />

          <div className="h-[350px] overflow-y-auto border rounded shadow">
            <table className="table w-full text-sm text-left text-gray-700">
              <thead className="bg-gray-100 text-black sticky top-0 z-10">
                <tr>
                  <th className="w-[1000px] px-4 py-2">Subject Name</th>
                  <th className="w-[100px] px-4 py-2 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubjects
                  .filter(subj => {
                    return (
                      subj.name?.toLowerCase().includes(searchSubject.toLowerCase())
                    );
                  })
                  .map(subj => {
                    return (
                      <tr key={subj.id} className={`${actionSubjectId === subj.id ? 'bg-blue-200 text-black' : 'hover:bg-blue-100 hover:text-black'}`}>
                        <td className="w-[1000px] px-4 py-2">{subj.name}</td>
                        <td className="relative w-[100px] px-4 py-2 text-center">
                          <button
                            ref={el => (buttonRefs.current[subj.id] = el)}
                            onClick={() => toggleDropdown(subj.id)}
                            className="text-xl px-2 py-1 rounded"
                          >
                            ⋮
                          </button>
                          {actionSubjectId === subj.id && (
                            <div
                              ref={dropdownRef}
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

      {/* Add/Edit Subject Modal */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h3 className="text-lg text-black font-bold mb-4">{editData ? 'Edit Subject' : 'Add Subject'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block mb-1 text-black font-semibold">Subject Name</label>
                <input
                  type="text"
                  className="input input-bordered w-full bg-white border border-gray-300 text-black"
                  value={subjectName}
                  onChange={e => setSubjectName(e.target.value)}
                  required
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setEditData(null); }}
                  className="btn bg-gray-300 hover:bg-gray-400 text-black"
                  disabled={loading}
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="btn bg-blue-500 hover:bg-blue-600 text-white"
                  disabled={loading}
                >
                  {loading ? (editData ? 'Saving...' : 'Adding...') : (editData ? 'Update' : 'Add')}
                </button>
              </div>
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