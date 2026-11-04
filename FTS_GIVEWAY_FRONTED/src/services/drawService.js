
import {
  collection,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";

import { db } from "./firebase";

export function subscribeWinners(callback, onError) {
  const winnersQuery = query(
    collection(db, "winners"),
    orderBy("drawOrder", "asc")
  );

  return onSnapshot(
    winnersQuery,
    (snapshot) => {
      const winners = snapshot.docs.map((document) => ({
        id: document.id,
        ...document.data(),
      }));

      callback(winners);
    },
    (error) => {
      console.error("Winner subscription failed:", error);
      onError?.(error);
    }
  );
}
