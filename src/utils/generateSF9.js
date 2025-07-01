import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import ImageModule from 'docxtemplater-image-module-free';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

/**
 * Fetches the system/settings document from Firestore.
 * @returns {Promise<Object>} The settings object, or an empty object if not found.
 */
export async function getSystemSettings() {
  try {
    const settingsDoc = await getDoc(doc(db, 'system', 'settings'));
    if (settingsDoc.exists()) {
      return settingsDoc.data();
    }
  } catch (e) {
    console.error('Failed to fetch system settings:', e);
  }
  return {};
}

/**
 * Generates an SF9 DOCX file for a student using the SF9_Template.docx template.
 * @param {Object} student - The student data to fill in the template.
 * @param {Object} classes - The class data, should include adviser/teacher info.
 * @returns {Promise<void>} - Triggers a download of the filled DOCX file.
 */
export async function generateSF9(student, classes) {
  // Fetch the template as ArrayBuffer
  const response = await fetch('/docx/SF 9 Elem and JHS - Sample.docx');
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

  if (!adviser) {
    adviser = localStorage.getItem('adviser').replace(/\([^)]*\)/g, '').replace(/\S+@\S+\.\S+/, '').trim().toUpperCase();;
  }

  const settings = await getSystemSettings();  
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
    principalName: settings.principalName || '',
    division: (settings.division || '').toUpperCase(),
    region: (settings.region || '').toUpperCase(),
    district: (settings.district || '').toUpperCase(),
    schoolName: (settings.schoolName || '').toUpperCase(),
    logoBase64: settings.logoBase64 || '',

    // className: classes?.sectionName || '',
  };

  // Image module options
  const imageOpts = {
    centered: false,
    getImage: function(tagValue) {
      if (!tagValue) return null;
      const base64 = tagValue.split(',')[1] || tagValue;
      // Convert base64 to Uint8Array for browser compatibility
      const binaryString = atob(base64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes;
    },
    getSize: function() {
      return [50, 50]; // width, height in px (fixed size)
    }
  };
  const imageModule = new ImageModule(imageOpts);

  const doc = new Docxtemplater(zip, {
    modules: [imageModule],
    paragraphLoop: true,
    linebreaks: true
  });
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
