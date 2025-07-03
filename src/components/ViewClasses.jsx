import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, onSnapshot } from 'firebase/firestore';
import ViewStudent from '../modals/ViewStudent';

export default function ViewClasses() {
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [searchClass, setSearchClass] = useState('');
  const [currentUserId, setCurrentUserId] = useState('');
  const [showViewStudentsModal, setShowViewStudentsModal] = useState(false);
  const [studentsInClass, setStudentsInClass] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentSearch, setStudentSearch] = useState('');

 

  useEffect(() => {
    const unsubscribeClasses = onSnapshot(collection(db, 'classes'), (snapshot) => {
      const updatedClasses = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        status: doc.data().status || 'active',
      }));
      setClasses(updatedClasses);
    });
  
    const unsubscribeStudents = onSnapshot(collection(db, 'students'), (snapshot) => {
      const updatedStudents = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setStudents(updatedStudents);
    });
  
    const userDocId = localStorage.getItem('userId');
    setCurrentUserId(userDocId);
  
    return () => {
      unsubscribeClasses();
      unsubscribeStudents();
    };
  }, []);   

  const handleViewStudents = (cls) => {
    const studentIds = Array.isArray(cls.students) ? cls.students : [];
    const filtered = students.filter(s => studentIds.includes(s.id));
    setStudentsInClass(filtered);
    setSelectedClass(cls);
    setShowViewStudentsModal(true);
  };

  const filteredClasses = classes
    .filter(cls => cls.adviserId === currentUserId)
    .filter(cls =>
      cls.gradeLevel?.toLowerCase().includes(searchClass.toLowerCase()) ||
      cls.sectionName?.toLowerCase().includes(searchClass.toLowerCase()) ||
      cls.adviser?.toLowerCase().includes(searchClass.toLowerCase())
    );

const filteredStudents = studentsInClass.filter(student =>
    `${student.firstName} ${student.lastName}`.toLowerCase().includes(studentSearch.toLowerCase()) ||
    student.learningReferenceNumber?.toLowerCase().includes(studentSearch.toLowerCase())
    );

const setClass = (cls) => {
  localStorage.setItem('adviser', cls.adviser);
}

  return (
    <div>
      <Section title="My Classes">
        <input
          type="text"
          placeholder="Search by Grade, Section, or Adviser"
          className="input input-bordered w-full bg-white border border-gray-300 text-black"
          value={searchClass}
          onChange={(e) => setSearchClass(e.target.value)}
        />

        <div className="h-[350px] overflow-y-auto border rounded shadow mt-4">
          <table className="table w-full text-sm text-left text-gray-700">
            <thead className="bg-gray-100 text-black sticky top-0 z-10">
                <tr>
                  <th className="w-[150px] px-4 py-2 text-center">Section Name</th>
                  <th className="w-[50px] px-4 py-2 text-center">Grade Level</th>
                  <th className="w-[450px] px-4 py-2 text-center">Adviser</th>
                  <th className="w-[100px] px-4 py-2 text-center">School Year</th>
                  <th className="w-[100px] px-4 py-2 text-center">Status</th>
                  <th className="w-[100px] px-4 py-2 text-center">Action</th>
                </tr>
              </thead>
            <tbody>
              {filteredClasses
                .filter(cls => cls.status !== 'archived')
                .map(cls => (
                  <tr key={cls.id} className="hover:bg-blue-100 hover:text-black">
                    <td className="w-[150px] px-4 py-2 text-center">{cls.sectionName}</td>
                    <td className="w-[50px] px-4 py-2 text-center">{cls.gradeLevel}</td>
                    <td className="w-[450px] px-4 py-2 text-center">{cls.adviser}</td>
                    <td className="w-[100px] px-4 py-2 text-center">{cls.schoolYear || '-'}</td>
                    <td className="w-[100px] px-4 py-2 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${cls.status === 'archived' ? 'bg-gray-400' : 'bg-green-500'} text-white`}>
                        {cls.status === 'archived' ? 'Archived' : 'Active'}
                      </span>
                    </td>
                    <td className="w-[100px] px-4 py-2 text-center">
                      <button
                        onClick={() => {handleViewStudents(cls), setClass(cls)}}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
                      >
                        Students
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Section>

      {showViewStudentsModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
            <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h3 className="text-lg text-black font-bold mb-4">
                Students in {selectedClass?.sectionName}
            </h3>

            <input
                type="text"
                placeholder="Search by name or LRN"
                className="input bg-white input-bordered w-full mb-3 border border-gray-300 text-black"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
            />

            {filteredStudents.length === 0 ? (
                <p className="text-gray-500">No students match your search.</p>
            ) : (
                <ul className="space-y-2 text-black max-h-60 overflow-y-auto">
                {filteredStudents.map(student => (
                    <li
                    key={student.id}
                    className="border-b py-1 flex justify-between items-center hover:bg-gray-100 px-2"
                    >
                    <span>
                        {student.lastName}, {student.firstName} ({student.learningReferenceNumber})
                    </span>
                    <button
                        className="text-sm text-blue-600 hover:underline"
                        onClick={() => setSelectedStudent(student)}
                    >
                        View
                    </button>
                    </li>
                ))}
                </ul>
            )}

            <button
                className="mt-4 btn bg-blue-600 text-white w-full"
                onClick={() => {setShowViewStudentsModal(false), localStorage.removeItem('adviser')}}
            >
                Close
            </button>
            </div>
        </div>
        )}

    {selectedStudent && (
    <ViewStudent
        student={selectedStudent}
        onClose={() => setSelectedStudent(null)}
        onGenerateSF9={(student) => {
        import('../utils/generateSF9').then(mod => mod.generateSF9(student));
        }}
    />
    )}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="bg-white p-6 rounded-lg shadow-md border border-gray-300 mb-8">
      <div className="flex justify-between items-center mb-4">
        {title && <h2 className="text-xl font-bold text-black">{title}</h2>}
      </div>
      {children}
    </section>
  );
}