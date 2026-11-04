import {
  collection,
  getDocs,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";

import { db } from "./firebase";

const participantsRef = collection(db, "participants");

export async function getParticipants() {
  const participantsQuery = query(
    participantsRef,
    orderBy("luckyNumber", "asc"),
  );

  const snapshot = await getDocs(participantsQuery);

  return snapshot.docs.map((document) => ({
    id: document.id,
    ...document.data(),
  }));
}

export function subscribeParticipants(callback, onError) {
  const participantsQuery = query(
    participantsRef,
    orderBy("luckyNumber", "asc"),
  );

  return onSnapshot(
    participantsQuery,
    (snapshot) => {
      const participants = snapshot.docs.map((document) => ({
        id: document.id,
        ...document.data(),
      }));

      callback(participants);
    },
    (error) => {
      console.error("Participant subscription failed:", error);
      onError?.(error);
    },
  );
}
