import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { generateSF9 } from '../utils/generateSF9';

// Usage: call this function with a student object
export async function handleGenerateSF9WithAdviser(student) {
  if (!student.classId) {
    alert('Student does not have a classId.');
    return;
  }
  try {
    const classRef = doc(db, 'classes', student.classId);
    const classSnap = await getDoc(classRef);
    if (classSnap.exists()) {
      const classData = classSnap.data();
      await generateSF9(student, {
        adviser: classData.adviser,
        name: classData.name,
      });
    } else {
      alert('Class not found!');
    }
  } catch (error) {
    console.error('Error fetching class/adviser:', error);
    alert('Failed to fetch class/adviser information.');
  }
}
