import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import RegisterClassModal from '../modals/RegisterClass';

export default function ManageClasses() {
  const [classes, setClasses] = useState([]);
  const [searchClass, setSearchClass] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editData, setEditData] = useState(null);
  const [refresh, setRefresh] = useState(false);

  useEffect(() => {
    const fetchClasses = async () => {
      const snapshot = await getDocs(collection(db, 'classes'));
      setClasses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchClasses();
  }, [refresh]);

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

  return (
    <div className="p-6">
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
                    <tr key={cls.id} className="hover:bg-blue-100 hover:text-black">
                      <td>{cls.gradeLevel}</td>
                      <td>{cls.sectionName}</td>
                      <td>{cls.adviser}</td>
                      <td className="space-x-2">
                        <button
                          className="btn btn-xs bg-yellow-400 text-black"
                          onClick={() => handleEdit(cls)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-xs btn-error text-white"
                          onClick={() => handleDelete(cls.id)}
                        >
                          Delete
                        </button>
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