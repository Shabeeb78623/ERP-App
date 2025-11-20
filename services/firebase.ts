
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// FIX: Removed firebase/analytics to avoid module errors in environments where it's not supported or mocked
// import { getAnalytics } from "firebase/analytics";

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
// const analytics = getAnalytics(app);
const db = getFirestore(app);

export { db, app };
