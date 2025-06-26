import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, setDoc, collection, getDocs, writeBatch, query, where } from 'firebase/firestore';
import PERMISSIONS, { ALL_PERMISSIONS_VALUE } from '../modules/Permissions';

export default function RegisterRole({ open, onClose, refreshRoles, editRole }) {
  const [roleName, setRoleName] = useState('');
  const [permissions, setPermissions] = useState(0);
  const [permissionInput, setPermissionInput] = useState('0');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (editRole) {
      setRoleName(editRole.name || '');
      setPermissions(editRole.permission || 0);
      setPermissionInput((editRole.permission || 0).toString());
    } else {
      setRoleName('');
      setPermissions(0);
      setPermissionInput('0');
    }
    setMessage('');
  }, [editRole, open]);

  if (!open) return null;

  const togglePermission = (bit) => {
    setPermissions((prev) => {
      let updated;
      if (prev === 0) {
        // If currently all permissions (0), start with all individual bits and remove the clicked one
        updated = ALL_PERMISSIONS_VALUE ^ bit;
      } else {
        // Normal toggle
        updated = prev ^ bit;
        // If we now have all permissions individually, set to 0
        if (updated === ALL_PERMISSIONS_VALUE) {
          updated = 0;
        }
      }
      setPermissionInput(updated.toString());
      return updated;
    });
  };

  const toggleSelectAll = () => {
    if (permissions === 0) {
      // If all permissions selected (0), deselect all by setting to individual bits
      setPermissions(ALL_PERMISSIONS_VALUE);
      setPermissionInput(ALL_PERMISSIONS_VALUE.toString());
    } else {
      // Select all permissions (set to 0)
      setPermissions(0);
      setPermissionInput('0');
    }
  };

  const handlePermissionInput = (e) => {
    const val = e.target.value;
    setPermissionInput(val);

    const intVal = parseInt(val, 10);
    if (!isNaN(intVal)) {
      setPermissions(intVal);
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
      let roleRef;
      const batch = writeBatch(db);
      
      if (editRole && editRole.id) {
        // Update existing role
        roleRef = doc(db, 'roles', editRole.id);
        batch.set(roleRef, {
          name: roleName,
          permission: permissions,
        }, { merge: true });

        // Update all users with this role to have the new permissions
        const usersQuery = query(collection(db, 'users'), where('role', '==', editRole.name));
        const usersSnapshot = await getDocs(usersQuery);
        
        usersSnapshot.docs.forEach((userDoc) => {
          const userRef = doc(db, 'users', userDoc.id);
          batch.set(userRef, {
            permissions: permissions
          }, { merge: true });
        });
        
        await batch.commit();
        setMessage(`✅ Role updated successfully! Updated ${usersSnapshot.docs.length} users with new permissions.`);
      } else {
        // Add new role
        roleRef = doc(collection(db, 'roles'));
        await setDoc(roleRef, {
          name: roleName,
          permission: permissions,
        });
        setMessage('✅ Role saved successfully!');
      }

      setRoleName('');
      setPermissionInput('0');
      setPermissions(0);

      if (typeof refreshRoles === 'function') {
        refreshRoles();
      }
      
      // Close modal after a short delay to show the success message
      setTimeout(() => {
        onClose();
      }, 1500);
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
        <h2 className="text-lg font-bold mb-4 text-center text-black">{editRole ? 'Edit Role' : 'Register Role'}</h2>
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
              onChange={(e) => (handlePermissionInput(e), setMessage(''))}
              required
            />
          </div>

          <div>
            <p className="font-semibold text-black mb-2">Permissions:</p>
            
            {/* Select All checkbox */}
            <label className="flex items-center text-black mb-3 font-medium">
              <input
                type="checkbox"
                checked={permissions === 0}
                onChange={toggleSelectAll}
                className="mr-2"
              />
              Select All Permissions
            </label>
            
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
            <div className="mt-2 text-xs text-gray-600">
              <p>Total permissions value: {permissions} {permissions === 0 && '(All Permissions)'}</p>
              <p>Individual permissions combined: {ALL_PERMISSIONS_VALUE}</p>
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
              {loading ? (editRole ? 'Saving...' : 'Saving...') : (editRole ? 'Update Role' : 'Save Role')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}