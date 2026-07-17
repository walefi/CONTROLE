import { initializeApp, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseConfigurado = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId
);

let app: FirebaseApp | null = null;
let firestore: Firestore | null = null;

if (firebaseConfigurado) {
  app = initializeApp(firebaseConfig);
  firestore = getFirestore(app);
}

export const db = firestore as Firestore;

export function obterUsuario(): string {
  return localStorage.getItem("led_manager_usuario")?.trim() || "Operador";
}

export function definirUsuario(nome: string) {
  localStorage.setItem("led_manager_usuario", nome.trim());
}
