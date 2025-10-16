// firebaseConfig.js
// This file connects your Elite Auto Sales app to Firebase.
// Paste your Firebase credentials below where it says “YOUR_...”.

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// 🔹 REPLACE the values inside the quotes ("") below with your Firebase config values.
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"
};

// 🔹 Initialize Firebase
const app = initializeApp(firebaseConfig);

// 🔹 Initialize Firebase services (Authentication, Database, and Storage)
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
