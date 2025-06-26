import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, getCountFromServer } from 'firebase/firestore';

const OVERVIEW = [
  {
    title: 'Students',
    icon: (
      <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m9-4.13a4 4 0 10-8 0 4 4 0 008 0z" /></svg>
    ),
    collection: 'students',
  },
  {
    title: 'Records',
    icon: (
      <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2a2 2 0 012-2h2a2 2 0 012 2v2m4 0V5a2 2 0 00-2-2H7a2 2 0 00-2 2v12m16 0a2 2 0 01-2 2H5a2 2 0 01-2-2" /></svg>
    ),
    collection: 'records',
  },
  {
    title: 'Classes',
    icon: (
      <svg className="w-8 h-8 text-yellow-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5zm0 0v6m0 0H6m6 0h6" /></svg>
    ),
    collection: 'classes',
  },
  {
    title: 'Accounts',
    icon: (
      <svg className="w-8 h-8 text-purple-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    ),
    collection: 'users',
  },
];

export default function DashboardHome() {
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCounts = async () => {
      setLoading(true);
      const results = await Promise.all(
        OVERVIEW.map(async ({ collection: col }) => {
          try {
            const snap = await getCountFromServer(collection(db, col));
            return snap.data().count;
          } catch {
            return 0;
          }
        })
      );
      const newStats = {};
      OVERVIEW.forEach((item, idx) => {
        newStats[item.title] = results[idx];
      });
      setStats(newStats);
      setLoading(false);
    };
    fetchCounts();
  }, []);

  return (
    <>
      <Section title="Quick Overview">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {OVERVIEW.map(({ title, icon }) => (
            <div key={title} className="stat bg-gradient-to-br from-white to-gray-100 border border-gray-200 shadow-lg rounded-xl flex flex-col items-center p-6 hover:scale-105 transition-transform">
              <div className="mb-2">{icon}</div>
              <div className="stat-title text-gray-700 font-semibold">{title}</div>
              <div className="stat-value text-3xl font-bold text-black mt-1">
                {loading ? <span className="animate-pulse">...</span> : stats[title] ?? 0}
              </div>
            </div>
          ))}
        </div>
      </Section>
      <Section title="Student Population">
        <div className="text-center text-gray-500 h-48 flex items-center justify-center">
          Chart
        </div>
      </Section>
    </>
  );
}

function Section({ title, children }) {
  return (
    <section className="bg-white p-6 rounded-lg shadow-md border border-gray-300 mb-8">
      <h2 className="text-xl font-bold text-black mb-4">{title}</h2>
      {children}
    </section>
  );
}