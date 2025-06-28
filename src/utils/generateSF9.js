import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';

/**
 * Generates an SF9 DOCX file for a student using the SF9_Template.docx template.
 * @param {Object} student - The student data to fill in the template.
 * @param {Object} classes - The class data, should include adviser/teacher info.
 * @returns {Promise<void>} - Triggers a download of the filled DOCX file.
 */
export async function generateSF9(student, classes) {
  // Fetch the template as ArrayBuffer
  const response = await fetch('/public/docx/SF 9 Elem and JHS - Sample.docx');
  const arrayBuffer = await response.arrayBuffer();
  const zip = new PizZip(arrayBuffer);

  // Calculate age from birthdate
  let age = '';
  if (student.birthdate) {
    const birth = new Date(student.birthdate);
    const today = new Date();
    let years = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      years--;
    }
    age = years;
  }

  // Prepare the data for the template using the current system's student object
  let adviser = classes?.adviser || classes?.teacher || '';
  // Remove email and parentheses, then make uppercase
  adviser = adviser.replace(/\([^)]*\)/g, '').replace(/\S+@\S+\.\S+/, '').trim().toUpperCase();

  const data = {
    firstName: student.firstName || '',
    middleName: student.middleName || '',
    lastName: student.lastName || '',
    nameExtension: student.nameExtension || '',
    learningReferenceNumber: student.learningReferenceNumber || '',
    birthdate: student.birthdate || '',
    age: age,
    sex: student.sex || '',
    schoolYear: student.schoolYear || '',
    gradeLevel: student.gradeLevel || '',
    adviser: adviser,
    // di pa nagana tinatamad na ko aa bukas na yan
    // className: classes?.sectionName || '',
  };

  // Use docxtemplater to fill the template
  const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
  doc.setData(data);
  try {
    doc.render();
  } catch (error) {
    console.error('Docxtemplater render error:', error);
    alert('Failed to generate SF9 document.');
    return;
  }
  const out = doc.getZip().generate({ type: 'blob' });

  // Trigger download
  const url = URL.createObjectURL(out);
  const a = document.createElement('a');
  a.href = url;
  a.download = `SF9_${data.lastName || 'student'}.docx`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}
