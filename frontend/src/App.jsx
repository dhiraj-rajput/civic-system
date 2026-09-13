import { BrowserRouter, Route, Routes } from "react-router-dom";

import Navbar from "./components/Navbar.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";

import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import BootstrapAdmin from "./pages/BootstrapAdmin.jsx";

import CitizenDashboard from "./pages/citizen/Dashboard.jsx";
import CitizenSubmit from "./pages/citizen/Submit.jsx";
import CitizenComplaints from "./pages/citizen/Complaints.jsx";

import OfficerDashboard from "./pages/officer/Dashboard.jsx";
import OfficerComplaints from "./pages/officer/Complaints.jsx";

import AdminDashboard from "./pages/admin/Dashboard.jsx";
import AdminComplaints from "./pages/admin/Complaints.jsx";
import AdminDepartments from "./pages/admin/Departments.jsx";
import AdminAnalytics from "./pages/admin/Analytics.jsx";

/* Route tree mirrors ResolveAI's PAGE_MAP/nav structure (home/about/login/
 * register + per-role dashboard/complaints/etc. pages), using react-router
 * routes + ProtectedRoute instead of Streamlit's session-state page guard. */
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/bootstrap-admin" element={<BootstrapAdmin />} />

          <Route path="/citizen" element={<ProtectedRoute roles={["citizen"]}><CitizenDashboard /></ProtectedRoute>} />
          <Route path="/citizen/submit" element={<ProtectedRoute roles={["citizen"]}><CitizenSubmit /></ProtectedRoute>} />
          <Route path="/citizen/complaints" element={<ProtectedRoute roles={["citizen"]}><CitizenComplaints /></ProtectedRoute>} />

          <Route path="/officer" element={<ProtectedRoute roles={["officer"]}><OfficerDashboard /></ProtectedRoute>} />
          <Route path="/officer/complaints" element={<ProtectedRoute roles={["officer"]}><OfficerComplaints /></ProtectedRoute>} />

          <Route path="/admin" element={<ProtectedRoute roles={["admin"]}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/complaints" element={<ProtectedRoute roles={["admin"]}><AdminComplaints /></ProtectedRoute>} />
          <Route path="/admin/departments" element={<ProtectedRoute roles={["admin"]}><AdminDepartments /></ProtectedRoute>} />
          <Route path="/admin/analytics" element={<ProtectedRoute roles={["admin"]}><AdminAnalytics /></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
