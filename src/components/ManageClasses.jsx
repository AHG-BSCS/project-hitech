import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import RegisterClassModal from '../modals/RegisterClass';

export default function ManageClasses() {
  const [classes, setClasses] = useState([]);
  const [searchClass, setSearchClass] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editData, setEditData] = useState(null);
  const [refresh, setRefresh] = useState(false);
  const [actionClassId, setActionClassId] = useState(null);
  const [dropUp, setDropUp] = useState(false);
  const [users, setUsers] = useState([]);
  const buttonRefs = useRef({});

  useEffect(() => {
    const fetchClasses = async () => {
      const snapshot = await getDocs(collection(db, 'classes'));
      setClasses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
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

  return (
    <div>
      <Section title="Manage Classes">
        <button
          className="btn bg-blue-600 text-white"
          onClick={() => {
            setEditData(null);
            setShowModal(true);
          }}
        >
          Add Class
        </button>
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
                  <th>Grade Level</th>
                  <th>Section Name</th>
                  <th>Adviser</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {classes
                  .filter(cls =>
                    cls.gradeLevel?.toLowerCase().includes(searchClass.toLowerCase()) ||
                    cls.sectionName?.toLowerCase().includes(searchClass.toLowerCase()) ||
                    cls.adviser?.toLowerCase().includes(searchClass.toLowerCase())
                  )
                  .map(cls => (
                    <tr key={cls.id} className={`$ {actionClassId === cls.id ? 'bg-blue-200 text-black' : 'hover:bg-blue-100 hover:text-black'}`}>
                      <td>{cls.gradeLevel}</td>
                      <td>{cls.sectionName}</td>
                      <td>{cls.adviser}</td>
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
                            className={`absolute ${dropUp ? 'bottom-full mb-2' : 'mt-2'} right-0 w-32 bg-white border rounded shadow-md z-10`}
                          >
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

      <RegisterClassModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onSaved={() => setRefresh(r => !r)}
        initialData={editData}
        users={users}
      />
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