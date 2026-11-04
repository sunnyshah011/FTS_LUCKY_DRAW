
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

import { loginAdmin } from "../../services/authService";
import { auth, authReady, db } from "../../services/firebase";

export default function AdminLogin() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Check whether an administrator is already logged in.
  useEffect(() => {
    let active = true;

    async function checkExistingLogin() {
      try {
        await authReady;

        if (!active) return;

        const unsubscribe = onAuthStateChanged(auth, async (user) => {
          if (!user) {
            if (active) setCheckingAuth(false);
            return;
          }

          try {
            const adminRef = doc(db, "admins", user.uid);
            const snapshot = await getDoc(adminRef);

            if (!active) return;

            if (
              snapshot.exists() &&
              snapshot.data().active === true &&
              snapshot.data().role === "admin"
            ) {
              navigate("/admin/dashboard", { replace: true });
            } else {
              await signOut(auth);

              if (active) {
                setMessage("This account is not authorized as an administrator.");
                setCheckingAuth(false);
              }
            }
          } catch (error) {
            console.error("Admin session verification failed:", error);

            if (active) {
              setMessage("Unable to verify your administrator account.");
              setCheckingAuth(false);
            }
          }
        });

        // Cleanup the authentication listener.
        return () => unsubscribe();
      } catch (error) {
        console.error("Authentication initialization failed:", error);

        if (active) {
          setMessage("Unable to initialize authentication. Please try again.");
          setCheckingAuth(false);
        }
      }
    }

    let unsubscribeCleanup;

    checkExistingLogin().then((cleanup) => {
      unsubscribeCleanup = cleanup;
    });

    return () => {
      active = false;
      unsubscribeCleanup?.();
    };
  }, [navigate]);

  async function submit(e) {
    e.preventDefault();

    setMessage("");
    setLoading(true);

    try {
      await loginAdmin(email, password);
      navigate("/admin/dashboard", { replace: true });
    } catch (err) {
      setMessage(err.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (checkingAuth) {
    return (
      <div className="text-center p-10 text-stone-300">
        Checking administrator session...
      </div>
    );
  }

  return (
    <section className="max-w-md mx-auto panel p-7">
      <h1 className="text-2xl font-bold">
        Admin <span className="gold">Login</span>
      </h1>

      <p className="text-stone-400 text-sm my-3">
        Authorized administrators only.
      </p>

      <form onSubmit={submit} className="space-y-4">
        <input
          className="field"
          type="email"
          placeholder="Admin email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          className="field"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button className="btn w-full" type="submit" disabled={loading}>
          {loading ? "Verifying..." : "Sign in"}
        </button>
      </form>

      {message && (
        <p className="text-amber-300 text-sm mt-4">{message}</p>
      )}
    </section>
  );
}
