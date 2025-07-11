import React, { useEffect, useState, useRef } from 'react';
import { collection, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import PERMISSIONS, { hasPermission, ALL_PERMISSIONS_VALUE } from '../modules/Permissions';
import RegisterRole from '../modals/RegisterRole';
import { usePermissions } from '../context/PermissionsContext';

export default function ManageRoles() {
  const [roles, setRoles] = useState([]);
  const [searchUser, setSearchUser] = useState('');
  const [actionUserId, setActionUserId] = useState(null);
  const [dropUp, setDropUp] = useState(false);
  const buttonRefs = useRef({});
  const dropdownRef = useRef(null); // NEW: ref for dropdown
  const [showRegisterRoleModal, setShowRegisterRoleModal] = useState(false);
  const [editRole, setEditRole] = useState(null); // NEW: Track role being edited
  const { permissions } = usePermissions();

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'roles'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRoles(data);
    });
  
    return () => unsubscribe();
  }, []);

  const getPermissionNames = (permissionInt) => {
    if (permissionInt === 0) return 'All Permissions';
    return Object.entries(PERMISSIONS)
      .filter(([_, bit]) => (permissionInt & bit) !== 0)
      .map(([name]) => name.replace(/_/g, ' '))
      .join(', ');
  };

  const handleDeleteRole = async (roleId) => {
    const confirm = window.confirm('Are you sure you want to delete this role?');
    if (!confirm) return;
  
    try {
      await deleteDoc(doc(db, 'roles', roleId));
    } catch (error) {
      console.error('Error deleting role:', error);
      alert('Failed to delete role.');
    }
  };

  const toggleDropdown = (id) => {
    if (actionUserId === id) {
      setActionUserId(null);
      return;
    }

    const button = buttonRefs.current[id];
    if (button) {
      const rect = button.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setDropUp(spaceBelow < 120);
    }

    setActionUserId(id);
  };

  // Add effect to close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (actionUserId !== null) {
        const button = buttonRefs.current[actionUserId];
        const dropdown = dropdownRef.current;
        if (
          button && !button.contains(event.target) &&
          dropdown && !dropdown.contains(event.target)
        ) {
          setActionUserId(null);
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [actionUserId]);

  if (!hasPermission(permissions, PERMISSIONS.MANAGE_ROLES)) {
    return (
      <Section title="Access Denied">
        <p className="text-red-500">You do not have permission to manage roles.</p>
      </Section>
    );
  }

  return (
    <div>
      <Section title="Manage Roles">
        <div>
          <button onClick={() => { setShowRegisterRoleModal(true); setEditRole(null); }} className="btn bg-blue-600 text-white">
            Add Role
          </button>
        </div>
      </Section>

      <Section>
        <div className="w-full flex flex-col space-y-4">
          <input
            type="text"
            placeholder="Search by Role Name"
            className="input input-bordered w-full bg-white border border-gray-300 text-black"
            value={searchUser}
            onChange={(e) => setSearchUser(e.target.value)}
          />

          <div className="h-[350px] overflow-y-auto border rounded shadow">
            <table className="table w-full text-sm text-left text-gray-700">
              <thead className="bg-gray-100 text-black sticky top-0 z-10">
                <tr>
                  <th className="w-[150px] px-4 py-2">Role Name</th>
                  <th className="w-[100px] px-4 py-2">Permission Integer</th>
                  <th className="w-[500px] px-4 py-2">Permissions</th>
                  <th className="w-[100px] px-4 py-2 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {roles
                  .filter(role => role.name.toLowerCase().includes(searchUser.toLowerCase()))
                  .map(role => (
                    <tr
                      key={role.id}
                      className={`${
                        actionUserId === role.id
                          ? 'bg-blue-200 text-black'
                          : 'hover:bg-blue-100 hover:text-black'
                      }`}
                    >
                      <td className="w-[150px] px-4 py-2">{role.name}</td>
                      <td className="w-[100px] px-4 py-2">{role.permission}</td>
                      <td className="w-[500px] px-4 py-2">{getPermissionNames(role.permission)}</td>
                      <td className="relative w-[100px] px-4 py-2 text-center">
                        <button
                          ref={el => (buttonRefs.current[role.id] = el)}
                          onClick={() => toggleDropdown(role.id)}
                          className="text-xl px-2 py-1 rounded"
                        >
                          ⋮
                        </button>
                        {actionUserId === role.id && (
                          <div
                            ref={dropdownRef}
                            className={`absolute ${dropUp ? 'bottom-full mb-2' : 'mt-2'} right-0 w-40 bg-white border rounded shadow-md z-10`}
                          >
                            <button
                              className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                              onClick={() => {
                                setEditRole(role); // Set role to edit
                                setShowRegisterRoleModal(true);
                                setActionUserId(null);
                              }}
                            >
                              Edit Role
                            </button>
                            <button
                              className="block w-full text-left px-4 py-2 text-red-600 hover:bg-red-100"
                              onClick={() => handleDeleteRole(role.id)}
                            >
                              Delete Role
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
      {showRegisterRoleModal && (
        <RegisterRole
          open={showRegisterRoleModal}
          onClose={() => {
            setShowRegisterRoleModal(false);
            setEditRole(null);
          }}
          editRole={editRole}
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