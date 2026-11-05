// import { initializeApp, applicationDefault, getApps } from "firebase-admin/app";

// import { getFirestore } from "firebase-admin/firestore";
// import { getAuth } from "firebase-admin/auth";

// if (getApps().length === 0) {
//   initializeApp({
//     credential: applicationDefault(),
//   });
// }

// export const db = getFirestore();
// export const auth = getAuth();


// import {
//   initializeApp,
//   cert,
//   getApps,
// } from "firebase-admin/app";

// import { getFirestore } from "firebase-admin/firestore";
// import { getAuth } from "firebase-admin/auth";
// import serviceAccount from "../../firebase-adminsdk.json" with { type: "json" };

// if (getApps().length === 0) {
//   initializeApp({
//     credential: cert(serviceAccount),
//     projectId: "sunny-shah-7a4ef",
//   });
// }

// export const db = getFirestore();
// export const auth = getAuth();


import {
  initializeApp,
  applicationDefault,
  getApps,
} from "firebase-admin/app";

import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

const PROJECT_ID = "sunny-shah-7a4ef";

if (getApps().length === 0) {
  initializeApp({
    credential: applicationDefault(),
    projectId: PROJECT_ID,
  });
}

export const db = getFirestore();
export const auth = getAuth();
