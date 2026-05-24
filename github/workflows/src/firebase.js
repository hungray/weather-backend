import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, FacebookAuthProvider } from "firebase/auth";
import { initializeFirestore } from "firebase/firestore";
import { getMessaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyDFJA5o-yyDGfafnMHtKHVAXGE5ikBEuqQ",
  authDomain: "weather-egypt-app.firebaseapp.com",
  projectId: "weather-egypt-app",
  storageBucket: "weather-egypt-app.firebasestorage.app",
  messagingSenderId: "315256962760",
  appId: "1:315256962760:web:629e22a4125b3ec5c22ffd",
  measurementId: "G-F8LQT0JXBG"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// 🔴 التعديل السحري لمنع مشكلة الأوفلاين 🔴
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});

export const googleProvider = new GoogleAuthProvider();
export const facebookProvider = new FacebookAuthProvider();
export const messaging = getMessaging(app);