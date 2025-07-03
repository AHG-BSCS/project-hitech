import React, { useEffect, useState } from 'react';
import { collection, getDoc, getDocs, query, where, doc } from 'firebase/firestore';
import { db } from '../firebase';

export default function GradesAnalysis({ student, onClose }) {
  const [grades, setGrades] = useState({});
  const [loading, setLoading] = useState(true);
  const [model, setModel] = useState(null);

  const subjectLabels = {
    Filipino: 'Filipino',
    English: 'English',
    Mathematics: 'Mathematics',
    Science: 'Science',
    AP: 'Araling Panlipunan',
    ESP: 'Edukasyon sa Pagpapakatao',
    TLE: 'Technology and Livelihood Education',
    MAPEH: 'MAPEH'
  };

  const subjectNames = [
    'Filipino', 'English', 'Mathematics', 'Science',
    'Araling Panlipunan', 'Edukasyon sa Pagpapakatao', 'Technology and Livelihood Education', 'MAPEH'
  ];

  const subjectOrder = [
    'Filipino', 'English', 'Mathematics', 'Science',
    'AP', 'ESP', 'TLE', 'MAPEH'
  ];

  useEffect(() => {
    if (!student) return;

    const fetchGrades = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, 'grades'), where('studentId', '==', student.id));
        const snapshot = await getDocs(q);

        const gradeMap = {};
        const subjectIdSet = new Set();

        snapshot.forEach(docSnap => {
          const data = docSnap.data();
          if (data?.subjectId) {
            const grade = {};
            ['q1', 'q2', 'q3', 'q4'].forEach(q => {
              grade[q] = data[q]?.finalized ? data[q].grade : null;
            });
            if (Object.values(grade).some(val => val !== null)) {
              gradeMap[data.subjectId] = grade;
              subjectIdSet.add(data.subjectId);
            }
          }
        });

        const subjectNames = {};
        await Promise.all(
          Array.from(subjectIdSet).map(async (id) => {
            try {
              const subjDoc = await getDoc(doc(db, 'subjects', id));
              subjectNames[id] = subjDoc.exists() ? subjDoc.data().name || id : id;
            } catch {
              subjectNames[id] = id;
            }
          })
        );

        const gradesWithNames = {};
        Object.entries(gradeMap).forEach(([id, grade]) => {
          const name = subjectNames[id] || id;
          gradesWithNames[name] = grade;
        });

        setGrades(gradesWithNames);
      } catch (error) {
        console.error('Error fetching grades:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchGrades();
  }, [student]);

  useEffect(() => {
    if (!loading && Object.keys(grades).length > 0) {
      const coverage = getQuarterCoverage(Object.entries(grades));
      if (coverage) {
        const modelFile = `/models/${coverage}_logistic_browser.json`;
        fetch(modelFile)
          .then(res => res.json())
          .then(data => {
            console.log("Model loaded:", data); // ✅ log here
            setModel(data);
          })
          .catch(err => {
            console.error(`Failed to load model ${modelFile}`, err);
            setModel(null);
          });
      } else {
        setModel(null);
      }
    }
  }, [grades, loading]);
   

  const getQuarterCoverage = (subjects) => {
    const quarters = ['q1', 'q2', 'q3'];
    const allHave = quarters.map(q =>
      subjects.every(([_, grade]) => grade[q] != null)
    );

    if (allHave[0] && !allHave[1]) return 'q1';
    if (allHave[0] && allHave[1] && !allHave[2]) return 'q12';
    if (allHave.every(Boolean)) return 'q123';
    return null;
  };
  
  const extractFeatures = (gradesBySubject, modelStage = 'q1') => {
    if (!model || !student) return [];
  
    const sex = student.sex === 'Male' || student.sex === 1 ? 1 : 0;
    const level = typeof student.gradeLevel === 'number'
      ? student.gradeLevel
      : parseInt(student.gradeLevel, 10);
    const gradeLevel = !isNaN(level) ? level : 0;
  
    const quarters = {
      q1: ['q1'],
      q12: ['q1', 'q2'],
      q123: ['q1', 'q2', 'q3']
    }[modelStage] || ['q1'];
  
    const subjectAliases = {
      'Araling Panlipunan': 'AP',
      'Edukasyon sa Pagpapakatao': 'ESP',
      'Technology and Livelihood Education': 'TLE'
    };
  
    const normalizedGrades = {};
    Object.entries(gradesBySubject).forEach(([name, val]) => {
      const alias = subjectAliases[name] || name;
      normalizedGrades[alias] = val;
    });
  
    const allGrades = [];
  
    for (const q of quarters) {
      for (const subject of subjectOrder) {
        const val = normalizedGrades[subject]?.[q];
        const grade = typeof val === 'number'
          ? val
          : (typeof val === 'string' ? parseFloat(val) : 0);
        allGrades.push(isNaN(grade) ? 0 : grade);
      }
    }
  
    const overallAvg =
      allGrades.length > 0
        ? allGrades.reduce((sum, g) => sum + g, 0) / allGrades.length
        : 0;
  
    const rawFeatures = [sex, gradeLevel, ...allGrades, overallAvg];
    console.log("📥 Input features (pre-scaled):", rawFeatures);
  
    if (model?.scaler) {
      const { mean, scale } = model.scaler;
    
      if (!Array.isArray(mean) || !Array.isArray(scale)) {
        console.warn("⚠️ Scaler mean/scale is not an array");
        return rawFeatures;
      }
    
      if (mean.length !== rawFeatures.length || scale.length !== rawFeatures.length) {
        console.warn("⚠️ Scaler length mismatch:", {
          featureLength: rawFeatures.length,
          meanLength: mean.length,
          scaleLength: scale.length
        });
        return rawFeatures;
      }
    
      const scaled = rawFeatures.map((x, i) =>
        scale[i] !== 0 ? (x - mean[i]) / scale[i] : 0
      );
      console.log("📊 Scaled features:", scaled);
      return scaled;
    }    
  
    return rawFeatures;
  };  

  const predictLogistic = (model, features) => {
    if (
      !model || 
      !Array.isArray(model.coefficients) || 
      typeof model.intercept !== 'number'
    ) {
      console.warn("Model weights not valid:", model?.coefficients, features);
      return { class: "N/A", probability: 0 };
    }

    if (features.length !== model.coefficients.length) {
      console.warn("Model weights not matching feature length:", model.coefficients, features);
      return { class: "N/A", probability: 0 };
    }

    const z = model.coefficients.reduce((sum, coef, i) => sum + coef * features[i], model.intercept);
    const exp = Math.exp(z);
    const probability = exp / (1 + exp);
    const predictedClass = probability >= 0.5 ? model.classes[1] : model.classes[0];
    console.log("📊 Prediction result:", {
      class: predictedClass,
      probability
    });

    return { class: predictedClass, probability };
  };

  const getFinalFromGrade = (grade) => {
    const keys = ['q1', 'q2', 'q3', 'q4'];
    const values = keys.map(k => {
      const val = typeof grade[k] === 'string' ? parseFloat(grade[k]) : grade[k];
      return typeof val === 'number' && !isNaN(val) ? val : null;
    });
    if (values.some(v => v === null)) return null;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  };

  const getFinalAverage = () => {
    const values = Object.values(grades)
      .map(g => getFinalFromGrade(g))
      .filter(n => typeof n === 'number');
    const total = values.reduce((sum, val) => sum + val, 0);
    return values.length ? (total / values.length).toFixed(2) : 'N/A';
  };

  const features = extractFeatures(grades);
  console.log("📥 Input Features to model:", features);
  const predictionResult = model ? predictLogistic(model, features) : null;

  if (!student || loading) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg shadow-md p-6 w-full max-w-4xl mx-4 overflow-y-auto max-h-[90vh]">
        <h2 className="text-xl font-bold text-black mb-4">
          Grades Analysis - {student.firstName} {student.lastName}
        </h2>

        <div className="overflow-x-auto">
          <table className="table w-full text-sm text-left text-black mb-6">
            <thead className="bg-gray-100 text-black">
              <tr>
                <th>Subject</th>
                <th>Q1</th>
                <th>Q2</th>
                <th>Q3</th>
                <th>Q4</th>
                <th>Final</th>
              </tr>
            </thead>
            <tbody>
              {subjectOrder.map(subject => {
                const grade = grades[subjectLabels[subject]] || {};
                const final = getFinalFromGrade(grade);
                return (
                  <tr key={subject}>
                    <td>{subjectLabels[subject]}</td>
                    <td>{grade.q1 ?? '-'}</td>
                    <td>{grade.q2 ?? '-'}</td>
                    <td>{grade.q3 ?? '-'}</td>
                    <td>{grade.q4 ?? '-'}</td>
                    <td className={final !== null && final < 75 ? 'text-red-600 font-semibold' : ''}>
                      {final !== null ? final.toFixed(2) : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mb-4 text-black font-semibold">
          Final Average: <span className="text-blue-700">{getFinalAverage()}</span>
        </div>

        {predictionResult && (
          <div className="mb-6 text-black">
            <h3 className="font-semibold">Predicted Outcome:</h3>
            {(() => {
              const { class: prediction, probability } = predictionResult;

              const labels = {
                0: { label: 'Did Not Meet Expectations', color: 'bg-red-500', icon: '🔴' },
                1: { label: 'Fairly Satisfactory', color: 'bg-yellow-500', icon: '🟡' },
                2: { label: 'Not at Risk', color: 'bg-green-500', icon: '🟢' }
              };

              const { label, color, icon } = labels[prediction] || {
                label: 'Unknown',
                color: 'bg-gray-500',
                icon: '❔'
              };

              return (
                <div className={`inline-block mt-2 px-2 py-1 rounded text-white ${color}`}>
                  {icon} {label} ({(probability * 100).toFixed(0)}%)
                </div>
              );
            })()}
          </div>
        )}

        <div className="flex justify-end mt-6">
          <button
            className="btn bg-gray-300 hover:bg-gray-400 text-black"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}