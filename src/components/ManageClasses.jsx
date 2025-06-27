import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import RegisterClassModal from '../modals/RegisterClass';
import RegisterStudent from '../modals/RegisterStudent';
import AddStudentToClassModal from '../modals/AddStudentToClassModal';
import PERMISSIONS, { hasPermission } from '../modules/Permissions';

export default function ManageClasses({ permissions }) {
  const [classes, setClasses] = useState([]);
  const [searchClass, setSearchClass] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editData, setEditData] = useState(null);
  const [refresh, setRefresh] = useState(false);
  const [actionClassId, setActionClassId] = useState(null);
  const [dropUp, setDropUp] = useState(false);
  const [users, setUsers] = useState([]);
  const [students, setStudents] = useState([]);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showViewStudentsModal, setShowViewStudentsModal] = useState(false);
  const [studentsInClass, setStudentsInClass] = useState([]);
  const [selectedStudentsToRemove, setSelectedStudentsToRemove] = useState([]);
  const buttonRefs = useRef({});
  const dropdownRef = useRef(null); // NEW: ref for dropdown
  const [currentUserName, setCurrentUserName] = useState('');
  const [currentUserId, setCurrentUserId] = useState('');
  const [currentUserEmail, setCurrentUserEmail] = useState('');

  useEffect(() => {
    const fetchClasses = async () => {
      const snapshot = await getDocs(collection(db, 'classes'));
      setClasses(snapshot.docs.map(doc => {
        const data = doc.data();
        return { id: doc.id, ...data, status: data.status || 'active' };
      }));
    };
    fetchClasses();
  }, [refresh]);

  useEffect(() => {
    const fetchUsers = async () => {
      const snapshot = await getDocs(collection(db, 'users'));
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    const fetchStudents = async () => {
      const snapshot = await getDocs(collection(db, 'students'));
      setStudents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchStudents();
  }, []);

  useEffect(() => {
    // Get employeeId and userId from localStorage
    const empId = localStorage.getItem('employeeId') || '';
    setCurrentUserId(empId);
    // Try to get the user's full name and email from the users collection
    const fetchCurrentUser = async () => {
      if (!empId) return;
      const user = users.find(u => u.employeeId === empId);
      setCurrentUserName(user ? user.name : '');
      setCurrentUserEmail(user ? (user.email || '') : '');
    };
    fetchCurrentUser();
  }, [users]);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this class?')) {
      await deleteDoc(doc(db, 'classes', id));
      setRefresh(r => !r);
    }
  };

  const handleEdit = (cls) => {
    setEditData(cls);
    setShowModal(true);
  };

  const handleViewStudents = (cls) => {
    // Use the students array from the class document to filter
    const studentIds = Array.isArray(cls.students) ? cls.students : [];
    const filtered = students.filter(s => studentIds.includes(s.id));
    setStudentsInClass(filtered);
    setSelectedClass(cls);
    setShowViewStudentsModal(true);
  };

  const toggleDropdown = (id) => {
    if (actionClassId === id) {
      setActionClassId(null);
      return;
    }
    const button = buttonRefs.current[id];
    if (button) {
      const rect = button.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setDropUp(spaceBelow < 120);
    }
    setActionClassId(id);
  };

  const handleRemoveSelectedStudents = async () => {
    if (!selectedClass || selectedStudentsToRemove.length === 0) return;
    const classRef = doc(db, 'classes', selectedClass.id);
    const updatedStudentIds = (Array.isArray(selectedClass.students) ? selectedClass.students : []).filter(
      id => !selectedStudentsToRemove.includes(id)
    );
    await updateDoc(classRef, { students: updatedStudentIds });
    setShowViewStudentsModal(false);
    setSelectedStudentsToRemove([]);
    setRefresh(r => !r);
  };

  const handleToggleStatus = async (cls) => {
    const classRef = doc(db, 'classes', cls.id);
    const newStatus = cls.status === 'archived' ? 'active' : 'archived';
    await updateDoc(classRef, { status: newStatus });
    setRefresh(r => !r);
  };

  // Permission helpers
  const canManage = hasPermission(permissions, PERMISSIONS.MANAGE_CLASSES);
  const canView = hasPermission(permissions, PERMISSIONS.VIEW_CLASSES);
  if (!canManage && !canView) {
    return (
      <Section title="Access Denied">
        <p className="text-red-500">You do not have permission to view classes.</p>
      </Section>
    );
  }
  const isViewOnly = canView && !canManage;

  // Filter classes for view-only users: only show classes where adviser contains current user's email (case-insensitive)
  const filteredClasses = isViewOnly
    ? classes.filter(cls => {
        const adviser = (cls.adviser || '').toLowerCase();
        return currentUserEmail && adviser.includes(currentUserEmail.toLowerCase());
      })
    : classes;

  // Add effect to close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      // Check if any dropdown is open
      if (actionClassId !== null) {
        const button = buttonRefs.current[actionClassId];
        const dropdown = dropdownRef.current;
        if (
          button && !button.contains(event.target) &&
          dropdown && !dropdown.contains(event.target)
        ) {
          setActionClassId(null);
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [actionClassId]);

  return (
    <div>
      <Section title="Manage Classes">
        {!isViewOnly && (
          <button
            className="btn bg-blue-600 text-white"
            onClick={() => {
              setEditData(null);
              setShowModal(true);
            }}
          >
            Add Class
          </button>
        )}
      </Section>

      <Section>
        <div className="w-full flex flex-col space-y-4">
          <input
            type="text"
            placeholder="Search by Grade, Section, or Adviser"
            className="input input-bordered w-full bg-white border border-gray-300 text-black"
            value={searchClass}
            onChange={(e) => setSearchClass(e.target.value)}
          />

          <div className="h-[350px] overflow-y-auto border rounded shadow">
            <table className="table w-full text-sm text-left text-gray-700">
              <thead className="bg-gray-100 text-black sticky top-0 z-10">
                <tr>
                  <th>Section Name</th>
                  <th>Grade Level</th>
                  <th>Adviser</th>
                  <th>School Year</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredClasses
                  .filter(cls => cls.status !== 'archived')
                  .filter(cls =>
                    cls.gradeLevel?.toLowerCase().includes(searchClass.toLowerCase()) ||
                    cls.sectionName?.toLowerCase().includes(searchClass.toLowerCase()) ||
                    cls.adviser?.toLowerCase().includes(searchClass.toLowerCase())
                  )
                  .map(cls => (
                    <tr key={cls.id} className={`${actionClassId === cls.id ? 'bg-blue-200 text-black' : 'hover:bg-blue-100 hover:text-black'}`}>
                      <td>{cls.sectionName}</td>
                      <td>{cls.gradeLevel}</td>
                      <td>{cls.adviser}</td>
                      <td>{cls.schoolYear || '-'}</td>
                      <td>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${cls.status === 'archived' ? 'bg-gray-400 text-white' : 'bg-green-500 text-white'}`}>
                          {cls.status === 'archived' ? 'Archived' : 'Active'}
                        </span>
                      </td>
                      <td className="relative">
                        <button
                          ref={el => (buttonRefs.current[cls.id] = el)}
                          onClick={() => toggleDropdown(cls.id)}
                          className="text-xl px-2 py-1 rounded"
                        >
                          ⋮
                        </button>
                        {actionClassId === cls.id && (
                          <div
                            ref={dropdownRef}
                            className={`absolute ${dropUp ? 'bottom-full mb-2' : 'mt-2'} right-0 w-32 bg-white border rounded shadow-md z-10`}
                          >
                            {!isViewOnly && (
                              <>
                                <button
                                  onClick={() => { setEditData(cls); setShowModal(true); setActionClassId(null); }}
                                  className="block w-full px-4 py-2 text-left hover:bg-gray-100"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => { handleDelete(cls.id); setActionClassId(null); }}
                                  className="block w-full px-4 py-2 text-left text-red-600 hover:bg-red-100"
                                >
                                  Delete
                                </button>
                                <button
                                  onClick={() => { setSelectedClass(cls); setShowAddStudentModal(true); setActionClassId(null); }}
                                  className="block w-full px-4 py-2 text-left text-green-700 hover:bg-green-100"
                                >
                                  Add Student
                                </button>
                                <button
                                  onClick={() => { handleToggleStatus(cls); setActionClassId(null); }}
                                  className={`block w-full px-4 py-2 text-left ${cls.status === 'archived' ? 'text-green-700 hover:bg-green-100' : 'text-gray-700 hover:bg-gray-100'}`}
                                >
                                  {cls.status === 'archived' ? 'Mark as Active' : 'Archive'}
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => { handleViewStudents(cls); setActionClassId(null); }}
                              className="block w-full px-4 py-2 text-left text-blue-700 hover:bg-blue-100"
                            >
                              View Students
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </Section>

      {/* Archived Classes Section */}
      <Section title="Archived Classes">
        {Object.entries(
          filteredClasses.filter(cls => cls.status === 'archived')
            .reduce((acc, cls) => {
              const year = cls.schoolYear || 'Unknown Year';
              if (!acc[year]) acc[year] = [];
              acc[year].push(cls);
              return acc;
            }, {})
        ).length === 0 ? (
          <div className="text-gray-500">No archived classes.</div>
        ) : (
          Object.entries(
            filteredClasses.filter(cls => cls.status === 'archived')
              .reduce((acc, cls) => {
                const year = cls.schoolYear || 'Unknown Year';
                if (!acc[year]) acc[year] = [];
                acc[year].push(cls);
                return acc;
              }, {})
          ).map(([year, archivedClasses]) => (
            <div key={year} className="mb-6">
              <h3 className="font-bold text-md mb-2">{year}</h3>
              <div className="flex flex-wrap gap-2">
                {archivedClasses.map(cls => (
                  <button
                    key={cls.id}
                    className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-black shadow text-sm flex items-center gap-2"
                    onClick={() => { handleViewStudents(cls); }}
                  >
                    <span className="font-semibold">{cls.sectionName}</span>
                    <span className="text-xs text-gray-600">({cls.gradeLevel})</span>
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </Section>

      <RegisterClassModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onSaved={() => setRefresh(r => !r)}
        initialData={editData}
        users={users}
      />

      {showAddStudentModal && !isViewOnly && (
        <AddStudentToClassModal
          open={showAddStudentModal}
          onClose={() => { setShowAddStudentModal(false); setSelectedClass(null); }}
          classData={selectedClass}
          students={students}
          onStudentAdded={() => setRefresh(r => !r)}
          allClassStudentIds={classes.flatMap(cls => Array.isArray(cls.students) ? cls.students : [])}
        />
      )}

      {showViewStudentsModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Students in {selectedClass?.sectionName}</h3>
            {studentsInClass.length === 0 ? (
              <p className="text-gray-500">No students assigned to this class.</p>
            ) : (
              <form
                onSubmit={e => {
                  e.preventDefault();
                  handleRemoveSelectedStudents();
                }}
              >
                <ul className="space-y-2 max-h-60 overflow-y-auto">
                  {studentsInClass.map(student => (
                    <li key={student.id} className="border-b py-1 flex items-center gap-2">
                      {!isViewOnly && (
                        <input
                          type="checkbox"
                          checked={selectedStudentsToRemove.includes(student.id)}
                          onChange={e => {
                            setSelectedStudentsToRemove(prev =>
                              e.target.checked
                                ? [...prev, student.id]
                                : prev.filter(id => id !== student.id)
                            );
                          }}
                        />
                      )}
                      {student.lastName}, {student.firstName} ({student.learningReferenceNumber})
                    </li>
                  ))}
                </ul>
                {!isViewOnly && (
                  <button
                    type="submit"
                    className="mt-4 btn bg-red-600 text-white w-full"
                    disabled={selectedStudentsToRemove.length === 0}
                  >
                    Remove Selected
                  </button>
                )}
              </form>
            )}
            <button
              className="mt-4 btn bg-blue-600 text-white w-full"
              onClick={() => { setShowViewStudentsModal(false); setSelectedStudentsToRemove([]); }}
            >
              Close
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
        {children}
      </div>
    </section>
  );
}