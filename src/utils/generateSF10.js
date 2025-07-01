import { generateXlsx } from 'xlsx-template-browser';

export async function generateSF10(student) {
  const values = {
    firstName: student.firstName || '',
    middleName: student.middleName || '',
    lastName: student.lastName || '',
    nameExtension: student.nameExtension || '',
    learningReferenceNumber: student.learningReferenceNumber || '',
    birthdate: student.birthdate || '',
    sex: student.sex || '',
  };

  const response = await fetch('/docx/sf10_jhs.xlsx');
  const arrayBuffer = await response.arrayBuffer();

  const blob = await generateXlsx(arrayBuffer, values);

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `SF10_${values.lastName || 'student'}.xlsx`;
  a.click();
}
