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

      setRoleName('');
      setPermissionInput('0');
      setPermissions(0);
      setMessage('✅ Role saved successfully!');

      if (typeof refreshRoles === 'function') {
        refreshRoles();
      }
    } catch (err) {
      console.error('Error saving role:', err);
      setMessage(`❌ ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg shadow-md p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold mb-4 text-center text-black">Register Role</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1">Role Name</label>
            <input
              name="roleName"
              placeholder="Role Name"
              className="input input-bordered w-full bg-white border border-gray-300 text-black"
              value={roleName}
              onChange={(e) => (setRoleName(e.target.value), setMessage(''))}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1">Permission Integer</label>
            <input
              type="number"
              min="0"
              className="input input-bordered w-full bg-white border border-gray-300 text-black"
              value={permissionInput}
              onChange={() => (handlePermissionInput, setMessage(''))}
            />
          </div>

          <div>
            <p className="font-semibold text-black mb-2">Permissions:</p>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-sm">
              {Object.entries(PERMISSIONS).map(([name, bit]) => (
                <label key={name} className="flex items-center text-black">
                  <input
                    type="checkbox"
                    checked={permissions === 0 || (permissions & bit) === bit}
                    onChange={() => (togglePermission(bit), setMessage(''))}
                    className="mr-2"
                  />
                  {name.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}
                </label>
              ))}
            </div>
          </div>

          {message && (
            <p className={`text-sm ${message.startsWith('✅') ? 'text-green-600' : 'text-red-500'}`}>
              {message}
            </p>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn bg-gray-300 hover:bg-gray-400 text-black"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn bg-blue-500 hover:bg-blue-600 text-white"
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Role'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}