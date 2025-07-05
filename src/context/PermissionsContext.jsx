import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

const PermissionsContext = createContext();

export const PermissionsProvider = ({ children }) => {
  const [permissions, setPermissions] = useState(0);
  const [userRole, setUserRole] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged(user => {
      if (!user) {
        setPermissions(0);
        setUserRole('');
        setLoading(false);
        return;
      }

      const q = query(collection(db, 'users'), where('uid', '==', user.uid));

      const unsubscribeSnapshot = onSnapshot(q, (querySnapshot) => {
        if (!querySnapshot.empty) {
          const userData = querySnapshot.docs[0].data();
          setPermissions(userData.permissions || 0);
          setUserRole(userData.role || '');
        }
        setLoading(false);
      });

      return () => unsubscribeSnapshot();
    });

    return () => unsubscribeAuth();
  }, []);

  return (
    <PermissionsContext.Provider value={{ permissions, userRole, loading }}>
      {children}
    </PermissionsContext.Provider>
  );
};

export const usePermissions = () => useContext(PermissionsContext);