const PERMISSIONS = {
    MANAGE_USERS: 1 << 0,
    MANAGE_CLASSES: 1 << 1,
    MANAGE_GRADES: 1 << 2,
    MANAGE_STUDENTS: 1 << 3,
    MANAGE_SETTINGS: 1 << 4,
    MANAGE_ROLES: 1 << 5,
  };
  
  export const hasPermission = (userPermissions, permission) => {
    if (userPermissions === 0) return true;
    return (userPermissions & permission) === permission;
  };
  
  export default PERMISSIONS;