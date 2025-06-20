// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC-X14Ej9I4e7JRKKPhMGP39HIDa3R2RUs",
  authDomain: "hitech-81b48.firebaseapp.com",
  projectId: "hitech-81b48",
  storageBucket: "hitech-81b48.firebasestorage.app",
  messagingSenderId: "92255126097",
  appId: "1:92255126097:web:61e2cc5d5eba0ff9c6ee70"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const temp = initializeApp(firebaseConfig, 'Temp');