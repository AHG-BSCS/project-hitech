import React, { useEffect, useState, useRef } from 'react';
import { collection, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import PERMISSIONS, { hasPermission } from '../modules/Permissions';
import RegisterStudent from '../modals/RegisterStudent';
import { handleGenerateSF9WithAdviser } from '../utils/handleGenerateSF9WithAdviser';
import { usePermissions } from '../context/PermissionsContext';

export default function ManageStudents() {
  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionStudentId, setActionStudentId] = useState(null);
  const [dropUp, setDropUp] = useState(false);
  const buttonRefs = useRef({});
  const dropdownRef = useRef(null); // NEW: ref for dropdown
  const [showRegisterStudentModal, setShowRegisterStudentModal] = useState(false);
  const [studentToEdit, setStudentToEdit] = useState(null);
  const [viewOnly, setViewOnly] = useState(false);
  const { permissions } = usePermissions();

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'students'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setStudents(data);
    });
  
    return () => unsubscribe();
  }, []);

  const handleDeleteStudent = async (studentId) => {
    const confirm = window.confirm('Are you sure you want to delete this student?');
    if (!confirm) return;

    try {
      await deleteDoc(doc(db, 'students', studentId));
    } catch (error) {
      console.error('Error deleting student:', error);
      alert('Failed to delete student.');
    }
  };

  const toggleDropdown = (id) => {
    if (actionStudentId === id) {
      setActionStudentId(null);
      return;
    }

    const button = buttonRefs.current[id];
    if (button) {
      const rect = button.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setDropUp(spaceBelow < 120);
    }

    setActionStudentId(id);
  };

  // Add effect to close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (actionStudentId !== null) {
        const button = buttonRefs.current[actionStudentId];
        const dropdown = dropdownRef.current;
        if (
          button && !button.contains(event.target) &&
          dropdown && !dropdown.contains(event.target)
        ) {
          setActionStudentId(null);
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [actionStudentId]);

  if (!hasPermission(permissions, PERMISSIONS.MANAGE_STUDENTS) && !hasPermission(permissions, PERMISSIONS.VIEW_STUDENTS)) {
    return (
      <Section title="Access Denied">
        <p className="text-red-500">You do not have permission to view students.</p>
      </Section>
    );
  }

  // Helper: is view-only (has view but not manage)
  const isViewOnly =
    hasPermission(permissions, PERMISSIONS.VIEW_STUDENTS) &&
    !hasPermission(permissions, PERMISSIONS.MANAGE_STUDENTS);

  return (
    <div>
      <Section title="Manage Students">
        {!isViewOnly && (
          <button
            onClick={() => setShowRegisterStudentModal(true)}
            className="btn bg-blue-600 text-white"
          >
            Add Student
          </button>
        )}
      </Section>

      <Section>
        <div className="w-full flex flex-col space-y-4">
          <input
            type="text"
            placeholder="Search by Student Name"
            className="input input-bordered w-full bg-white border border-gray-300 text-black"
            value={searchTerm.toUpperCase()}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <div className="h-[350px] overflow-y-auto border rounded shadow">
            <table className="table w-full text-sm text-left text-gray-700">
            <thead className="bg-gray-100 text-black sticky top-0 z-10">
                <tr>
                    <th className="w-32">LRN</th>
                    <th className="w-32">First Name</th>
                    <th className="w-32">Last Name</th>
                    <th className="w-24">Sex</th>
                    <th className="w-32">Actions</th>
                </tr>
                </thead>
                <tbody>
                {students
                    .filter((student) => {
                    const term = searchTerm.toUpperCase();
                    return (
                        student.firstName?.toUpperCase().includes(term) ||
                        student.lastName?.toUpperCase().includes(term) ||
                        student.learningReferenceNumber?.includes(term)
                    );
                    })
                    .map((student) => (
                    <tr
                        key={student.id}
                        className={`${
                        actionStudentId === student.id
                            ? 'bg-blue-200 text-black'
                            : 'hover:bg-blue-100 hover:text-black'
                        }`}
                    >
                        <td>{student.learningReferenceNumber}</td>
                        <td>{student.firstName}</td>
                        <td>{student.lastName}</td>
                        <td>{student.sex}</td>
                        <td className="relative">
                        <button
                            ref={el => (buttonRefs.current[student.id] = el)}
                            onClick={() => toggleDropdown(student.id)}
                            className="text-xl px-2 py-1 rounded"
                        >
                            ⋮
                        </button>
                        {actionStudentId === student.id && (
                            <div
                            ref={dropdownRef}
                            className={`absolute $${
                                dropUp ? 'bottom-full mb-2' : 'mt-2'
                            } right-0 w-40 bg-white border rounded shadow-md z-10`}
                            >
                            <button
                              className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                              onClick={() => {
                                setStudentToEdit(student);
                                setShowRegisterStudentModal(true);
                                setActionStudentId(null);
                                setViewOnly(true);
                              }}
                            >
                              View Student
                            </button>
                            {!isViewOnly && (
                              <>
                                <button
                                  className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                                  onClick={() => {
                                    setStudentToEdit(student);
                                    setShowRegisterStudentModal(true);
                                    setActionStudentId(null);
                                    setViewOnly(false);
                                  }}
                                >
                                  Edit Student
                                </button>
                                <button
                                  className="block w-full text-left px-4 py-2 text-red-600 hover:bg-red-100"
                                  onClick={() => handleDeleteStudent(student.id)}
                                >
                                  Delete Student
                                </button>
                              </>
                            )}
                            <button
                              className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                              onClick={async () => {
                                await handleGenerateSF9WithAdviser(student);
                                setActionStudentId(null);
                              }}
                            >
                              Download SF9
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

      {showRegisterStudentModal && (
        <RegisterStudent
          open={showRegisterStudentModal}
          onClose={() => {
            setShowRegisterStudentModal(false);
            setStudentToEdit(null);
            setViewOnly(false);
          }}
          studentToEdit={studentToEdit}
          viewOnly={viewOnly}
        />             
      )}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="bg-white p-6 rounded-lg shadow-md border border-gray-300 mb-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-black">{title}</h2>
        {children}
      </div>
    </section>
  );
}