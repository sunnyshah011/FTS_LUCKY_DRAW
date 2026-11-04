
import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, authReady, db } from "../services/firebase";

export default function ProtectedRoute() {
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let active = true;
    let checkId = 0;
    let unsubscribe = () => { };

    async function initializeAuth() {
      try {
        await authReady;

        if (!active) return;

        unsubscribe = onAuthStateChanged(auth, async (user) => {
          const currentCheck = ++checkId;

          if (!user) {
            if (active) setStatus("unauthorized");
            return;
          }

          try {
            const adminRef = doc(db, "admins", user.uid);
            const snapshot = await getDoc(adminRef);

            if (!active || currentCheck !== checkId) return;

            if (!snapshot.exists()) {
              setStatus("unauthorized");
              return;
            }

            const admin = snapshot.data();

            if (admin.active === true && admin.role === "admin") {
              setStatus("authorized");
            } else {
              setStatus("unauthorized");
            }
          } catch (error) {
            console.error("Admin verification failed:", error);

            if (active && currentCheck === checkId) {
              setStatus("error");
            }
          }
        });
      } catch (error) {
        console.error("Firebase authentication initialization failed:", error);

        if (active) setStatus("error");
      }
    }

    initializeAuth();

    return () => {
      active = false;
      checkId++;
      unsubscribe();
    };
  }, []);

  if (status === "loading") {
    return (
      <div className="p-10 text-center">
        Verifying administrator...
      </div>
    );
  }

  if (status === "unauthorized") {
    return <Navigate to="/admin" replace />;
  }

  if (status === "error") {
    return (
      <div className="p-10 text-center">
        <p>Unable to verify administrator access.</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 rounded bg-amber-500 px-4 py-2 text-black"
        >
          Try Again
        </button>
      </div>
    );
  }

  return <Outlet />;
}
