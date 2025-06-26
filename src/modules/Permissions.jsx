const PERMISSIONS = {
    MANAGE_USERS: 1 << 0,      // 1
    MANAGE_CLASSES: 1 << 1,    // 2
    MANAGE_GRADES: 1 << 2,     // 4
    MANAGE_STUDENTS: 1 << 3,   // 8
    MANAGE_SETTINGS: 1 << 4,   // 16
    MANAGE_ROLES: 1 << 5,      // 32
    PORTAL_SETTINGS: 1 << 6,   // 64
    // View-only permissions
    VIEW_STUDENTS: 1 << 7,     // 128
    VIEW_CLASSES: 1 << 8,      // 256
    VIEW_GRADES: 1 << 9,       // 512
    VIEW_USERS: 1 << 10,       // 1024
  };
  
  // Calculate the value for all permissions combined (now includes view permissions)
  export const ALL_PERMISSIONS_VALUE = Object.values(PERMISSIONS).reduce((a, b) => a | b, 0);
  
  export const hasPermission = (userPermissions, permission) => {
    // If user has permission value of 0, they have all permissions
    if (userPermissions === 0) return true;
    return (userPermissions & permission) === permission;
  };
  
  export default PERMISSIONS;