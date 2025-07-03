import React, { createContext, useContext, useEffect, useState } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';

const SystemSettingsContext = createContext();

export function useSystemSettings() {
  return useContext(SystemSettingsContext);
}

export function SystemSettingsProvider({ children }) {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const docRef = doc(db, 'system', 'settings');

    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setSettings(docSnap.data());
      } else {
        setSettings({});
      }
      setLoading(false);
    }, (error) => {
      console.error('Error fetching system settings:', error);
      setSettings({});
      setLoading(false);
    });

    return () => unsubscribe(); // Clean up on unmount
  }, []);

  return (
    <SystemSettingsContext.Provider value={{ settings, loading }}>
      {children}
    </SystemSettingsContext.Provider>
  );
}