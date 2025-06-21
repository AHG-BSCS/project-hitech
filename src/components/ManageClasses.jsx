import React, { useState } from 'react';
import { db } from '../firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, setDoc } from 'firebase/firestore';

function AddClassModal({ open, onClose, onSaved, initialData }) {
  const [gradeLevel, setGradeLevel] = useState(initialData?.gradeLevel || '');
  const [sectionName, setSectionName] = useState(initialData?.sectionName || '');
  const [adviser, setAdviser] = useState(initialData?.adviser || '');
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    setGradeLevel(initialData?.gradeLevel || '');
    setSectionName(initialData?.sectionName || '');
    setAdviser(initialData?.adviser || '');
  }, [initialData, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (initialData && initialData.id) {
        // Edit mode
        await setDoc(doc(db, 'classes', initialData.id), {
          gradeLevel,
          sectionName,
          adviser,
          createdAt: initialData.createdAt || new Date(),
        }, { merge: true });
      } else {
        // Add mode
        await addDoc(collection(db, 'classes'), {
          gradeLevel,
          sectionName,
          adviser,
          createdAt: new Date(),
        });
      }
      setGradeLevel('');
      setSectionName('');
      setAdviser('');
      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      alert('Failed to save: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Add Class</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-1 font-medium">Grade Level</label>
            <input
              type="text"
              className="input input-bordered w-full border border-gray-300"
              value={gradeLevel}
              onChange={e => setGradeLevel(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block mb-1 font-medium">Section Name</label>
            <input
              type="text"
              className="input input-bordered w-full border border-gray-300"
              value={sectionName}
              onChange={e => setSectionName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block mb-1 font-medium">Adviser</label>
            <input
              type="text"
              className="input input-bordered w-full border border-gray-300"
              value={adviser}
              onChange={e => setAdviser(e.target.value)}
              required
            />
          </div>
          <div className="flex justify-end space-x-2">
            <button type="button" className="btn" onClick={onClose} disabled={loading}>Cancel</button>
            <button type="submit" className="btn bg-blue-600 text-white" disabled={loading}>
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ManageClasses() {
  const [showModal, setShowModal] = useState(false);
  const [editData, setEditData] = useState(null);
  const [classes, setClasses] = useState([]);
  const [refresh, setRefresh] = useState(false);

  React.useEffect(() => {
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
      <h1 className="text-2xl font-bold mb-4">Classes</h1>
      <button
        className="btn bg-blue-600 text-white mb-4"
        onClick={() => { setShowModal(true); setEditData(null); }}
      >
        Add Class
      </button>
      <AddClassModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onSaved={() => setRefresh(r => !r)}
        initialData={editData}
      />
      <div className="mt-6">
        <table className="table w-full text-sm text-left text-gray-700">
          <thead className="bg-gray-100 text-black">
            <tr>
              <th>Grade Level</th>
              <th>Section Name</th>
              <th>Adviser</th>
              <th>Created At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {classes.map(cls => (
              <tr key={cls.id}>
                <td>{cls.gradeLevel}</td>
                <td>{cls.sectionName}</td>
                <td>{cls.adviser}</td>
                <td>{cls.createdAt?.toDate ? cls.createdAt.toDate().toLocaleString() : ''}</td>
                <td className="space-x-2">
                  <button
                    className="btn btn-xs bg-yellow-400 text-black"
                    onClick={() => handleEdit(cls)}
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn-error btn-xs text-white"
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
  );
}
