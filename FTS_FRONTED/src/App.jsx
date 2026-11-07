import { Routes, Route } from "react-router-dom";

import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";

import Home from "./pages/Home";
import Participants from "./pages/Participants";
import Winners from "./pages/Winners";
import LiveDraw from "./pages/LiveDraw";

import AdminLogin from "./pages/admin/AdminLogin";
import ManageParticipants from "./pages/admin/ManageParticipants";
import Dashboard from "./pages/admin/Dashboard";
import ImportCustomers from "./pages/admin/ImportCustomers";
import ManagePrizes from "./pages/admin/ManagePrizes";
import DrawControl from "./pages/admin/DrawControl";
import ResetDrawButton from "./pages/admin/ResetDrawButton";

export default function App() {
  return (
    <Layout>
      <Routes>
        {/* Public pages */}
        <Route path="/" element={<Home />} />
        <Route path="/participants" element={<Participants />} />
        <Route path="/winners" element={<Winners />} />
        <Route path="/live" element={<LiveDraw />} />

        {/* Admin login */}
        <Route path="/admin" element={<AdminLogin />} />

        {/* One shared authentication check for all admin pages */}
        <Route element={<ProtectedRoute />}>
          <Route path="/admin/dashboard" element={<Dashboard />} />

          <Route path="/admin/import" element={<ImportCustomers />} />

          <Route path="/admin/participants" element={<ManageParticipants />} />

          <Route path="/admin/prizes" element={<ManagePrizes />} />

          <Route path="/admin/draw" element={<DrawControl />} />

          <Route path="/admin/draw/reset" element={<ResetDrawButton />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Home />} />
      </Routes>
    </Layout>
  );
}
