import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, signInAnonymously } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDu1yZAFo2yDFQI1xm4SQmI86uG2bnheHM",
  authDomain: "epr-app-a0dcb.firebaseapp.com",
  projectId: "epr-app-a0dcb",
  storageBucket: "epr-app-a0dcb.firebasestorage.app",
  messagingSenderId: "430077497930",
  appId: "1:430077497930:web:f87fb79ed5d5f9a48eccb3",
  measurementId: "G-S4VN569F50"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const initializeAuth = async () => {
    try {
        if (!auth.currentUser) {
            await signInAnonymously(auth);
        }
    } catch (error) {
        console.error("Failed to sign in anonymously:", error);
    }
};

export { db, app, auth, initializeAuth };