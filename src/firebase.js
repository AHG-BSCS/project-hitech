// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCqbS5swXqAfB8rd8R-M3ZcZpgk5Y3U1EE",
  authDomain: "project-hitech-35c60.firebaseapp.com",
  projectId: "project-hitech-35c60",
  storageBucket: "project-hitech-35c60.firebasestorage.app",
  messagingSenderId: "293615864250",
  appId: "1:293615864250:web:c7185f02c3cc00734c3583",
  measurementId: "G-MNM8NTK0HP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const temp = initializeApp(firebaseConfig, 'Temp');