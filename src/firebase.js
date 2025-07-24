import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Configurația ta din Firebase Console (Project Settings > General > Your Apps > Web)
const firebaseConfig = {
  apiKey: "AIzaSyC_ZblDlt2qWzNwcKmH_FxDBjYvXfjifTI",
  authDomain: "profx-mentori.firebaseapp.com",
  projectId: "profx-mentori",
  storageBucket: "profx-mentori.firebasestorage.app",
  messagingSenderId: "976371943897",
  appId: "1:976371943897:web:906308a34b1a1e58b971c8"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };