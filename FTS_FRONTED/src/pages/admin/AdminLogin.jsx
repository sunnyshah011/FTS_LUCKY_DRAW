import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginAdmin, currentAdmin } from "../../services/authService";
export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  useEffect(() => {
    let live = true;
    currentAdmin().then((a) => {
      if (live) {
        if (a) navigate("/admin/dashboard", { replace: true });
        else setCheckingAuth(false);
      }
    });
    return () => {
      live = false;
    };
  }, [navigate]);
  async function submit(e) {
    e.preventDefault();
    setMessage("");
    setLoading(true);
    try {
      await loginAdmin(email, password);
      navigate("/admin/dashboard", { replace: true });
    } catch (e) {
      setMessage(e.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  }
  if (checkingAuth)
    return (
      <div className="text-center p-10 text-stone-300">
        Checking administrator session...
      </div>
    );
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
      {message && <p className="text-amber-300 text-sm mt-4">{message}</p>}
    </section>
  );
}
