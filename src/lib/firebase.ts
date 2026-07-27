import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged, 
  updateProfile,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
  User
} from "firebase/auth";

import firebaseConfigJson from "../../firebase-applet-config.json";

// Your web app's Firebase configuration
const firebaseConfig = firebaseConfigJson;

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

export { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged, 
  updateProfile,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup
};
export type { User };
