/// <reference types="vite/client" />
import { initializeApp } from "firebase/app";
import { getFirestore, doc, updateDoc, setDoc, getDoc, onSnapshot } from "firebase/firestore";

// A configuração virá do env, ou o app prosseguirá offline se faltar dados
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "dummy",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "dummy",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "fut-pro",
};

let app: any;
let db: any;

try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
} catch (e) {
  console.warn("Firebase config is dummy or invalid. Running Offline-First.", e);
}

export const syncMatchStateToFirebase = async (matchId: string, state: any) => {
  if (!db || firebaseConfig.apiKey === "dummy") return;
  try {
    const docRef = doc(db, 'matches', matchId);
    // Usa updateDoc para ser atômico e não sobrescrever o documento inteiro se outros campos existirem
    await updateDoc(docRef, state).catch(async (err) => {
      // Se o documento não existir, cria com setDoc
      if (err.code === 'not-found') {
        await setDoc(docRef, state);
      } else {
        throw err;
      }
    });
  } catch (error) {
    console.error("Sync Error Background:", error);
  }
};

export const loadMatchStateFromFirebase = async (matchId: string) => {
  if (!db || firebaseConfig.apiKey === "dummy") return null;
  try {
    const docRef = doc(db, 'matches', matchId);
    const snap = await getDoc(docRef);
    if (snap.exists()) return snap.data();
  } catch (error) {
    console.error("Load Error Firebase:", error);
  }
  return null;
};

export const subscribeToMatchState = (matchId: string, onUpdate: (data: any) => void) => {
  if (!db || firebaseConfig.apiKey === "dummy") return () => {};
  try {
    const docRef = doc(db, 'matches', matchId);
    const unsubscribe = onSnapshot(docRef, (docSnap: any) => {
        if (docSnap.exists()) {
            onUpdate(docSnap.data());
        }
    }, (error: any) => {
        console.error("Firestore Subscribe Error:", error);
    });
    return unsubscribe;
  } catch (error) {
    console.error("Setup Subscribe Error:", error);
    return () => {};
  }
};
