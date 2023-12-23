import { initializeApp } from "firebase/app";
import { getAnalytics, logEvent } from "firebase/analytics";
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  query,
  orderBy,
  limit,
} from "firebase/firestore/lite";

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: "little-tetris-game.firebaseapp.com",
  projectId: "little-tetris-game",
  storageBucket: "little-tetris-game.appspot.com",
  messagingSenderId: "304613125071",
  appId: "1:304613125071:web:010765bfa182f5d1ffc0ba",
  measurementId: "G-DQTZSFH3Q5",
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const analytics = getAnalytics(app);

// Requests

export type Leader = {
  id: string;
  player: string;
  lines: number;
  date: string;
};

export async function getLeaderboard(): Promise<Leader[]> {
  try {
    const colRef = collection(db, "leaderboard");
    const q = query(colRef, orderBy("lines", "desc"), limit(10));
    const docsRef = await getDocs(q);

    return (
      docsRef.docs.map((doc) => ({ ...doc.data(), id: doc.id } as Leader)) || []
    );
  } catch (error) {
    console.log(error);
    return [];
  }
}

export async function addPayerToLeaderboard(player: string, lines: number) {
  try {
    if (!player || !lines) throw new Error("Invalid request body");
    const docRef = await addDoc(collection(db, "leaderboard"), {
      player,
      lines,
      date: new Date().toISOString(),
    });
    return docRef.id;
  } catch (error) {
    console.log(error);
  }
}

// Analytics

export function trackGameFinish(lines: number) {
  logEvent(analytics, "tetris_game_finish", {
    lines,
  });
}

export function trackSignGameFinish(lines: number, player: string) {
  logEvent(analytics, "tetris_sign_game_finish", {
    lines,
    player,
  });
}

export function trackGameRestart() {
  logEvent(analytics, "tetris_game_restart");
}
