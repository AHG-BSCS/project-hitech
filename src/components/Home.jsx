import React from 'react';

export default function DashboardHome() {
  return (
    <>
      <Section title="Quick Overview">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {['Students', 'Records', 'Classes', 'Accounts'].map((title) => (
            <div key={title} className="stat bg-white border border-gray-300 shadow-md">
              <div className="stat-title text-black">{title}</div>
              <div className="stat-value text-black">0000</div>
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