// Import the functions you need from the SDKs you need
import { initializeApp, getApps } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries


// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyB-Ta7LQG3U_P96_dbOzxckUWru3fnV0gs",
  authDomain: "gamersns-1c1aa.firebaseapp.com",
  projectId: "gamersns-1c1aa",
  storageBucket: "gamersns-1c1aa.firebasestorage.app",
  messagingSenderId: "890057349743",
  appId: "1:890057349743:web:6bb4da8dabd82b59ee4b9a",
  measurementId: "G-99HBXB74MV"
};

// Initialize Firebase
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app); 



/*
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyB-Ta7LQG3U_P96_dbOzxckUWru3fnV0gs",
  authDomain: "gamersns-1c1aa.firebaseapp.com",
  projectId: "gamersns-1c1aa",
  storageBucket: "gamersns-1c1aa.firebasestorage.app",
  messagingSenderId: "890057349743",
  appId: "1:890057349743:web:6bb4da8dabd82b59ee4b9a",
  measurementId: "G-99HBXB74MV"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
 */