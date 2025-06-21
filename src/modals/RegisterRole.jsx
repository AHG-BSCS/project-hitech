import { useState } from 'react';
import { db } from '../firebase';
import { doc, setDoc, collection } from 'firebase/firestore';
import PERMISSIONS from '../modules/Permissions';

export default function RegisterRole({ open, onClose, refreshRoles }) {
  const [roleName, setRoleName] = useState('');
  const [permissions, setPermissions] = useState(0);
  const [permissionInput, setPermissionInput] = useState('0');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  if (!open) return null;

  const togglePermission = (bit) => {
    setPermissions((prev) => {
      const updated = prev ^ bit;
      setPermissionInput(updated.toString());
      return updated;
    });
  };  

  const handlePermissionInput = (e) => {
    const val = e.target.value;
    setPermissionInput(val);

    const intVal = parseInt(val, 10);
    if (!isNaN(intVal)) {
      if (intVal === 0) {
        const all = Object.values(PERMISSIONS).reduce((a, b) => a | b, 0);
        setPermissions(all);
      } else {
        setPermissions(intVal);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    if (!roleName.trim()) {
      setMessage('❌ Role name is required.');
      setLoading(false);
      return;
    }

    try {
      const roleRef = doc(collection(db, 'roles'));

      await setDoc(roleRef, {
        name: roleName,
        permission: permissions,
      });

      setMessage('✅ Role saved successfully!');
      setRoleName('');
      setPermissionInput('0');
      setPermissions(0);

      if (typeof refreshRoles === 'function') {
        refreshRoles(); // ✅ Refresh roles if prop is provided
      }
    } catch (err) {
      console.error('Error saving role:', err);
      setMessage(`❌ ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-sm bg-white shadow-xl p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-xl font-bold"
          onClick={onClose}
        >
          &times;
        </button>
        <h2 className="text-2xl font-bold text-center mb-4 text-black">Register Role</h2>
        <form onSubmit={handleSubmit}>
          <input
            name="roleName"
            placeholder="Role Name"
            className="input input-bordered w-full mb-3"
            value={roleName}
            onChange={(e) => setRoleName(e.target.value)}
            required
          />

          <label className="text-sm text-gray-700 font-medium mb-1 block">Permission Integer</label>
          <input
            type="number"
            min="0"
            className="input input-bordered w-full mb-3"
            value={permissionInput}
            onChange={handlePermissionInput}
          />

          <div className="mb-3">
            <p className="font-semibold text-black mb-2">Permission:</p>
            {Object.entries(PERMISSIONS).map(([name, bit]) => (
              <label key={name} className="flex items-center mb-1 text-sm text-black">
                <input
                  type="checkbox"
                  checked={permissions === 0 || (permissions & bit) === bit}
                  onChange={() => togglePermission(bit)}
                  className="mr-2"
                />
                {name.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}
              </label>
            ))}
          </div>

          {message && (
            <p className={`text-sm mb-3 ${message.startsWith('✅') ? 'text-green-600' : 'text-red-500'}`}>
              {message}
            </p>
          )}
          <button type="submit" className="btn btn-primary w-full" disabled={loading}>
            {loading ? 'Saving...' : 'Save Role'}
          </button>
        </form>
      </div>
    </div>
  );
}