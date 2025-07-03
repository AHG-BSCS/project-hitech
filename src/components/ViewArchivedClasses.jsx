import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, onSnapshot } from 'firebase/firestore';
import ViewStudent from '../modals/ViewStudent';

export default function ViewArchivedClasses() {
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [searchClass, setSearchClass] = useState('');
  const [currentUserId, setCurrentUserId] = useState('');
  const [showViewStudentsModal, setShowViewStudentsModal] = useState(false);
  const [studentsInClass, setStudentsInClass] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedSchoolYear, setSelectedSchoolYear] = useState('');
  const [selectedGradeLevel, setSelectedGradeLevel] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      const [classSnap, studentSnap] = await Promise.all([
        getDocs(collection(db, 'classes')),
        getDocs(collection(db, 'students'))
      ]);

      setClasses(classSnap.docs.map(doc => ({ id: doc.id, ...doc.data(), status: doc.data().status || 'active' })));
      setStudents(studentSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchData();

    const userDocId = localStorage.getItem('userId');
    setCurrentUserId(userDocId);
  }, []);

  useEffect(() => {
    const unsubscribeClasses = onSnapshot(collection(db, 'classes'), (snapshot) => {
      const updatedClasses = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        status: doc.data().status || 'active'
      }));
      setClasses(updatedClasses);
    });

    
  
    const fetchStudents = async () => {
      const studentSnap = await getDocs(collection(db, 'students'));
      setStudents(studentSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
  
    fetchStudents();
  
    const userDocId = localStorage.getItem('userId');
    setCurrentUserId(userDocId);
  
    return () => {
        unsubscribeClasses();
    }}, []);

  const handleViewStudents = (cls) => {
    const studentIds = Array.isArray(cls.students) ? cls.students : [];
    const filtered = students.filter(s => studentIds.includes(s.id));
    setStudentsInClass(filtered);
    setSelectedClass(cls);
    setShowViewStudentsModal(true);
  };

  const filteredClasses = classes
  .filter(cls => cls.status === 'archived')
  .filter(cls =>
    cls.sectionName?.toLowerCase().includes(searchClass.toLowerCase()) ||
    cls.adviser?.toLowerCase().includes(searchClass.toLowerCase())
  )
  .filter(cls =>
    (!selectedSchoolYear || cls.schoolYear === selectedSchoolYear) &&
    (!selectedGradeLevel || cls.gradeLevel === selectedGradeLevel)
  );

  const schoolYears = [...new Set(classes
    .filter(cls => cls.status === 'archived')
    .map(cls => cls.schoolYear || 'Unknown Year'))].sort((a, b) => b.localeCompare(a));
  
  const gradeLevels = [...new Set(classes
    .filter(cls => cls.status === 'archived')
    .map(cls => cls.gradeLevel || 'Unknown Grade'))].sort((a, b) => {
      const numA = parseInt(a.match(/\d+/)?.[0]) || 0;
      const numB = parseInt(b.match(/\d+/)?.[0]) || 0;
      return numA - numB;
    });    

  const filteredStudents = studentsInClass.filter(student =>
    `${student.firstName} ${student.lastName}`.toLowerCase().includes(studentSearch.toLowerCase()) ||
    student.learningReferenceNumber?.toLowerCase().includes(studentSearch.toLowerCase())
  );

  const setClass = (cls) => {
    localStorage.setItem('adviser', cls.adviser);
  };

  return (
    <div>
      <Section title="Archived Classes">
      <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4 gap-2 mb-4">
        <input
            type="text"
            placeholder="Search by Section or Adviser"
            className="input input-bordered w-full bg-white border border-gray-300 text-black"
            value={searchClass}
            onChange={(e) => setSearchClass(e.target.value)}
        />

        <select
            className="select select-bordered bg-white border border-gray-300 text-black w-full sm:w-60"
            value={selectedGradeLevel}
            onChange={(e) => setSelectedGradeLevel(e.target.value)}
        >
            <option value="">All Grade Levels</option>
            {gradeLevels.map((level) => (
            <option key={level} value={level}>
                {level}
            </option>
            ))}
        </select>

        <select
            className="select select-bordered bg-white border border-gray-300 text-black w-full sm:w-60"
            value={selectedSchoolYear}
            onChange={(e) => setSelectedSchoolYear(e.target.value)}
        >
            <option value="">All School Years</option>
            {schoolYears.map((year) => (
            <option key={year} value={year}>
                {year}
            </option>
            ))}
        </select>

        <button
            className="btn btn-sm bg-gray-200 text-black"
            onClick={() => {
                setSearchClass('');
                setSelectedSchoolYear('');
                setSelectedGradeLevel('');
            }}
            >
            Clear Filters
            </button>
        </div>

        <div className="h-[350px] overflow-y-auto border rounded shadow mt-4">
          <table className="table w-full text-sm text-left text-gray-700">
            <thead className="bg-gray-100 text-black sticky top-0 z-10">
              <tr>
                <th>Section Name</th>
                <th>Grade Level</th>
                <th>Adviser</th>
                <th>School Year</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredClasses.map(cls => (
                <tr key={cls.id} className="hover:bg-blue-100 hover:text-black">
                  <td>{cls.sectionName}</td>
                  <td>{cls.gradeLevel}</td>
                  <td>{cls.adviser}</td>
                  <td>{cls.schoolYear || '-'}</td>
                  <td>
                    <span className="px-2 py-1 rounded text-xs font-semibold bg-gray-400 text-white">
                      Archived
                    </span>
                  </td>
                  <td>
                    <button
                      onClick={() => { handleViewStudents(cls); setClass(cls); }}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
                    >
                      View Students
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
              onClick={() => {
                setShowViewStudentsModal(false);
                localStorage.removeItem('adviser');
              }}
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