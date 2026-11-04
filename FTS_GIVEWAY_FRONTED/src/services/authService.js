
import {
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";

import { doc, getDoc } from "firebase/firestore";
import { auth, authReady, db } from "./firebase";

export async function loginAdmin(email, password) {
  await authReady;

  const result = await signInWithEmailAndPassword(
    auth,
    email,
    password
  );

  const user = result.user;

  try {
    const adminRef = doc(db, "admins", user.uid);
    const adminSnapshot = await getDoc(adminRef);

    if (!adminSnapshot.exists()) {
      await signOut(auth);
      throw new Error("You are not authorized as an administrator.");
    }

    const adminData = adminSnapshot.data();

    if (adminData.active !== true || adminData.role !== "admin") {
      await signOut(auth);
      throw new Error("Your administrator account is inactive.");
    }

    return {
      success: true,
      user,
      admin: adminData,
    };
  } catch (error) {
    // Do not sign out if Firestore temporarily fails.
    throw error;
  }
}

export async function logoutAdmin() {
  return signOut(auth);
}
