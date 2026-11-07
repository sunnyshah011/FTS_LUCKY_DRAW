import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { currentAdmin } from "../services/authService";
export default function ProtectedRoute() {
  const [status, setStatus] = useState("loading");
  useEffect(() => {
    let active = true;
    currentAdmin()
      .then((admin) => {
        if (active) setStatus(admin ? "authorized" : "unauthorized");
      })
      .catch(() => {
        if (active) setStatus("unauthorized");
      });
    return () => {
      active = false;
    };
  }, []);
  if (status === "loading")
    return <div className="p-10 text-center">Verifying administrator...</div>;
  if (status !== "authorized") return <Navigate to="/admin" replace />;
  return <Outlet />;
}
