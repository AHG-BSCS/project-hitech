import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, setDoc, collection, getDocs, writeBatch, query, where } from 'firebase/firestore';
import PERMISSIONS, { ALL_PERMISSIONS_VALUE } from '../modules/Permissions';

// Tooltip component
const Tooltip = ({ children, text }) => {
  const [show, setShow] = useState(false);
  let hideTimeout = null;

  // Helper to delay hiding so user can move from icon to tooltip
  const handleMouseLeave = () => {
    hideTimeout = setTimeout(() => setShow(false), 80);
  };
  const handleMouseEnter = () => {
    if (hideTimeout) clearTimeout(hideTimeout);
    setShow(true);
  };

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="cursor-help"
      >
        {children}
      </div>
      {show && (
        <div
          className="absolute z-20 px-3 py-2 text-xs font-medium text-white bg-gray-900 rounded-md shadow-lg top-full left-0 transform mb-2 w-96 max-w-[98vw] max-h-60 overflow-y-auto whitespace-pre-line"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {text}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
        </div>
      )}
    </div>
  );
};

// Helper to generate tooltip text dynamically
const getPermissionTooltipText = () => {
  return [
    'Permission System:',
    '• 0 = All Permissions (SuperAdmin)',
    '• Each permission has a bit value',
    '• Add values to combine permissions',
    '',
    'Examples:',
    '• READ_USERS (1) + WRITE_USERS (2) = 3',
    `• All individual permissions = ${ALL_PERMISSIONS_VALUE}`,
    '',
    'Available permissions:',
    ...Object.entries(PERMISSIONS).map(
      ([name, bit]) => `• ${name.replace(/_/g, ' ')}: ${bit}`
    ),
  ].join('\n');
};

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
      setPermissions(null); // null means nothing checked
      setPermissionInput('');
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

  // Select All logic
  const toggleSelectAll = () => {
    if (permissions === 0) {
      // If all permissions are selected, unchecking clears all
      setPermissions(null);
      setPermissionInput('');
    } else {
      // Checking always sets to 0 (all perms)
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
      // Check for duplicate role name (case-insensitive)
      const rolesSnapshot = await getDocs(collection(db, 'roles'));
      const duplicate = rolesSnapshot.docs.find(doc => {
        const name = doc.data().name || '';
        // If editing, allow the same name for the current role
        if (editRole && doc.id === editRole.id) return false;
        return name.trim().toLowerCase() === roleName.trim().toLowerCase();
      });
      if (duplicate) {
        setMessage('❌ A role with this name already exists.');
        setLoading(false);
        return;
      }

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
        <h2 className="text-lg font-bold mb-4 text-center text-black">{editRole ? 'Edit Role' : 'Add Role'}</h2>
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
              autoComplete="off"
              autoFocus
              // Set defaultValue only for add (not edit)
              {...(!editRole ? { defaultValue: '' } : {})}
            />
          </div>

          <div>
            <label className="flex items-center text-sm font-medium text-gray-800 mb-1">
              Permission Integer
              <Tooltip text={getPermissionTooltipText()}>
                <svg className="w-4 h-4 ml-1 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
              </Tooltip>
            </label>
            <input
              type="number"
              min="0"
              className="input input-bordered w-full bg-white border border-gray-300 text-black"
              value={permissionInput}
              onChange={(e) => (handlePermissionInput(e), setMessage(''))}
              required
              autoComplete="off"
              // Set defaultValue only for add (not edit)
              {...(!editRole ? { defaultValue: '' } : {})}
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
                    checked={permissions === 0 ? true : (permissions & bit) === bit}
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
              <ul className="mt-1 list-disc list-inside text-xs text-gray-500">
                <li>"View" permissions allow read-only access (e.g., a role can view but not edit, remove, or create).</li>
                <li>Combine "View" and "Manage" permissions for full access.</li>
              </ul>
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
              Close
            </button>
            <button
              type="submit"
              className="btn bg-blue-500 hover:bg-blue-600 text-white"
              disabled={loading}
            >
              {loading ? (editRole ? 'Saving...' : 'Adding...') : (editRole ? 'Update' : 'Add')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}