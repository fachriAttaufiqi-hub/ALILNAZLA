import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

// Safe configuration with inline fallback so GitHub / Netlify build never fails
const getFirebaseConfig = () => {
  return {
    projectId: "zeta-groove-6c9s2",
    appId: "1:323214469930:web:3c5dc66be51784eae60c53",
    apiKey: "AIzaSyDGa1scgWWh6XJC0XxKAGTtEMUvf9b5SwA",
    authDomain: "zeta-groove-6c9s2.firebaseapp.com",
    storageBucket: "zeta-groove-6c9s2.firebasestorage.app",
    messagingSenderId: "323214469930",
  };
};

let app: any = null;
let auth: any = null;
let googleAuthProvider: any = null;

try {
  const config = getFirebaseConfig();
  if (config && config.apiKey) {
    app = getApps().length > 0 ? getApp() : initializeApp(config);
    auth = getAuth(app);
    googleAuthProvider = new GoogleAuthProvider();
  }
} catch (err) {
  console.warn('Firebase initialization note (running in standalone/Supabase mode):', err);
}

export { app, auth, googleAuthProvider };
