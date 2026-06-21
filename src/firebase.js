import { initializeApp } from "firebase/app";
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Firebase configuration provided by the user
export const firebaseConfig = {
  apiKey: "AIzaSyCOViJinfwx7pXlhh3fSqt1oAOUmLQPB70",
  authDomain: "sidi-touati.firebaseapp.com",
  projectId: "sidi-touati",
  storageBucket: "sidi-touati.firebasestorage.app",
  messagingSenderId: "825539304217",
  appId: "1:825539304217:web:0ccf8eca4e8520702d8388",
  measurementId: "G-4QN66ZCW27"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});
export const auth = getAuth(app);
