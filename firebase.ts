import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyApAppWmdHS2z28HHQaxiqA5alFCWYmNPs",
  authDomain: "saudi-e95a2.firebaseapp.com",
  projectId: "saudi-e95a2",
  storageBucket: "saudi-e95a2.firebasestorage.app",
  messagingSenderId: "785575427961",
  appId: "1:785575427961:web:7b15d0cd15fd59710679a8",
  measurementId: "G-W7PGR9GBCV"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore (실시간 데이터베이스)
export const db = getFirestore(app);

// Initialize Analytics (선택사항)
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

export default app;
