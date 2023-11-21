import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore, collection, getDocs } from "firebase/firestore/lite";

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
  player: string;
  lines: number;
  date: string;
};

export async function getLeaderboard(): Promise<Leader[]> {
  try {
    const citiesCol = collection(db, "leaderboard");
    const citySnapshot = await getDocs(citiesCol);
    const cityList = citySnapshot.docs.map((doc) => doc.data() as Leader);
    return cityList || [];
  } catch (error) {
    console.log(error);
    return [];
  }
}
