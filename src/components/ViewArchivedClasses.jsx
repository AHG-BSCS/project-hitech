import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import ViewStudent from '../modals/ViewStudent';

export default function ViewArchivedClasses() {
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [currentUserId, setCurrentUserId] = useState('');

  const [filters, setFilters] = useState({
    searchClass: '',
    selectedGradeLevel: '',
    selectedSchoolYear: '',
  });

  const [modalState, setModalState] = useState({
    showViewStudentsModal: false,
    selectedClass: null,
    studentsInClass: [],
    selectedStudent: null,
    studentSearch: '',
  });

  useEffect(() => {
    const userDocId = localStorage.getItem('userId');
    setCurrentUserId(userDocId);

    const unsubscribeClasses = onSnapshot(collection(db, 'classes'), (snapshot) => {
      setClasses(snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        status: doc.data().status || 'active'
      })));
    });

    const unsubscribeStudents = onSnapshot(collection(db, 'students'), (snapshot) => {
      setStudents(snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })));
    });

    return () => {
      unsubscribeClasses();
      unsubscribeStudents();
    };
  }, []);

  const handleViewStudents = (cls) => {
    const studentIds = Array.isArray(cls.students) ? cls.students : [];
    const filtered = students.filter(s => studentIds.includes(s.id));
    localStorage.setItem('adviser', cls.adviser);

    setModalState(prev => ({
      ...prev,
      showViewStudentsModal: true,
      selectedClass: cls,
      studentsInClass: filtered
    }));
  };

  const filteredClasses = classes
    .filter(cls => cls.status === 'archived')
    .filter(cls =>
      cls.sectionName?.toLowerCase().includes(filters.searchClass.toLowerCase()) ||
      cls.adviser?.toLowerCase().includes(filters.searchClass.toLowerCase())
    )
    .filter(cls =>
      (!filters.selectedSchoolYear || cls.schoolYear === filters.selectedSchoolYear) &&
      (!filters.selectedGradeLevel || cls.gradeLevel === filters.selectedGradeLevel)
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

  const filteredStudents = modalState.studentsInClass.filter(student =>
    `${student.firstName} ${student.lastName}`.toLowerCase().includes(modalState.studentSearch.toLowerCase()) ||
    student.learningReferenceNumber?.toLowerCase().includes(modalState.studentSearch.toLowerCase())
  );

  const handleClearFilters = () => {
    setFilters({
      searchClass: '',
      selectedGradeLevel: '',
      selectedSchoolYear: ''
    });
  };

  return (
    <div>
      <Section title="Archived Classes">
        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4 gap-2 mb-4">
          <input
            type="text"
            placeholder="Search by Section or Adviser"
            className="input input-bordered w-full bg-white border border-gray-300 text-black"
            value={filters.searchClass}
            onChange={(e) => setFilters({ ...filters, searchClass: e.target.value })}
          />

          <select
            className="select select-bordered bg-white border border-gray-300 text-black w-full sm:w-60"
            value={filters.selectedGradeLevel}
            onChange={(e) => setFilters({ ...filters, selectedGradeLevel: e.target.value })}
          >
            <option value="">All Grade Levels</option>
            {gradeLevels.map(level => (
              <option key={level} value={level}>{level}</option>
            ))}
          </select>

          <select
            className="select select-bordered bg-white border border-gray-300 text-black w-full sm:w-60"
            value={filters.selectedSchoolYear}
            onChange={(e) => setFilters({ ...filters, selectedSchoolYear: e.target.value })}
          >
            <option value="">All School Years</option>
            {schoolYears.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>

          <button
            className="btn btn-sm bg-gray-200 text-black"
            onClick={handleClearFilters}
          >
            Clear Filters
          </button>
        </div>

        <div className="h-[350px] overflow-y-auto border rounded shadow mt-4">
          <table className="table w-full text-sm text-left text-gray-700">
            <thead className="bg-gray-100 text-black sticky top-0 z-10">
              <tr>
                <th className="px-4 py-2 text-center">Section Name</th>
                <th className="px-4 py-2 text-center">Grade Level</th>
                <th className="px-4 py-2 text-center">Adviser</th>
                <th className="px-4 py-2 text-center">School Year</th>
                <th className="px-4 py-2 text-center">Status</th>
                <th className="px-4 py-2 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredClasses.map(cls => (
                <tr key={cls.id} className="hover:bg-blue-100 hover:text-black">
                  <td className="px-4 py-2 text-center">{cls.sectionName}</td>
                  <td className="px-4 py-2 text-center">{cls.gradeLevel}</td>
                  <td className="px-4 py-2 text-center">{cls.adviser}</td>
                  <td className="px-4 py-2 text-center">{cls.schoolYear || '-'}</td>
                  <td className="px-4 py-2 text-center">
                    <span className="px-2 py-1 rounded text-xs font-semibold bg-gray-400 text-white">
                      Archived
                    </span>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <button
                      onClick={() => handleViewStudents(cls)}
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

      {modalState.showViewStudentsModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h3 className="text-lg text-black font-bold mb-4">
              Students in {modalState.selectedClass?.sectionName}
            </h3>

            <input
              type="text"
              placeholder="Search by name or LRN"
              className="input bg-white input-bordered w-full mb-3 border border-gray-300 text-black"
              value={modalState.studentSearch}
              onChange={(e) =>
                setModalState(prev => ({ ...prev, studentSearch: e.target.value }))
              }
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
                      onClick={() => setModalState(prev => ({ ...prev, selectedStudent: student }))}
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
                setModalState(prev => ({
                  ...prev,
                  showViewStudentsModal: false,
                  studentSearch: '',
                  selectedClass: null,
                  studentsInClass: []
                }));
                localStorage.removeItem('adviser');
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {modalState.selectedStudent && (
        <ViewStudent
          student={modalState.selectedStudent}
          onClose={() => setModalState(prev => ({ ...prev, selectedStudent: null }))}
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