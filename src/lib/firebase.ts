import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

export const firebaseConfig = {
  apiKey: "AIzaSyDMgxFzBpuVCI1kg-i76JuFZGvo7MEDhxY",
  authDomain: "zalosale2.firebaseapp.com",
  projectId: "zalosale2",
  storageBucket: "zalosale2.firebasestorage.app",
  messagingSenderId: "95278445292",
  appId: "1:95278445292:web:8c3c60970f089ec8312bc9"
};

// Initialize Firebase (Singleton pattern to prevent re-initialization)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const firestore = getFirestore(app);
export const storage = getStorage(app);
export default app;

