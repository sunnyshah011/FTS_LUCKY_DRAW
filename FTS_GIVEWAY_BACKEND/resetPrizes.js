
import { initializeApp, applicationDefault, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

if (getApps().length === 0) {
  initializeApp({
    credential: applicationDefault(),
    projectId: "sunny-shah-7a4ef",
  });
}

const db = getFirestore();

async function resetPrizes() {
  const snapshot = await db.collection("prizes").get();

  if (snapshot.empty) {
    console.log("No prizes found.");
    return;
  }

  const batch = db.batch();

  snapshot.docs.forEach((doc) => {
    batch.update(doc.ref, {
      drawn: false,
      drawnAt: null,
      winnerId: null,
    });
  });

  await batch.commit();

  console.log(`Successfully reset ${snapshot.size} prizes.`);
}

resetPrizes().catch(console.error);
