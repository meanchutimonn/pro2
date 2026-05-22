import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAmcy5VLonKLFyldkj_ssiRSjnOQEiyf-A",
  authDomain: "trace-e720a.firebaseapp.com",
  projectId: "trace-e720a",
  storageBucket: "trace-e720a.firebasestorage.app",
  messagingSenderId: "838926058278",
  appId: "1:838926058278:web:533184299eeb27cd1eb7e7",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
