import { BrowserRouter, Route, Routes } from "react-router-dom";

import ProtectedRoute from "./components/ProtectedRoute.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import DashboardLayout from "./components/layout/DashboardLayout.jsx";

import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import BootstrapAdmin from "./pages/BootstrapAdmin.jsx";
import PublicTrack from "./pages/PublicTrack.jsx";

import CitizenDashboard from "./pages/citizen/Dashboard.jsx";
import CitizenSubmit from "./pages/citizen/Submit.jsx";
import CitizenComplaints from "./pages/citizen/Complaints.jsx";
import CitizenTrack from "./pages/citizen/TrackComplaint.jsx";

import OfficerDashboard from "./pages/officer/Dashboard.jsx";
import OfficerComplaints from "./pages/officer/Complaints.jsx";

import AdminDashboard from "./pages/admin/Dashboard.jsx";
import AdminComplaints from "./pages/admin/Complaints.jsx";
import AdminDepartments from "./pages/admin/Departments.jsx";
import AdminAnalytics from "./pages/admin/Analytics.jsx";
import ComplaintDetail from "./pages/ComplaintDetail.jsx";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/bootstrap-admin" element={<BootstrapAdmin />} />
          <Route path="/track" element={<PublicTrack />} />
          <Route path="/track/:id" element={<PublicTrack />} />

          {/* Authenticated Routes with Dashboard Layout */}
          <Route path="/citizen/*" element={
            <ProtectedRoute roles={["citizen"]}>
              <DashboardLayout>
                <Routes>
                  <Route path="/" element={<CitizenDashboard />} />
                  <Route path="/submit" element={<CitizenSubmit />} />
                  <Route path="/complaints" element={<CitizenComplaints />} />
                  <Route path="/complaints/:id" element={<ComplaintDetail />} />
                  <Route path="/track" element={<CitizenTrack />} />
                  <Route path="/track/:id" element={<CitizenTrack />} />
                </Routes>
              </DashboardLayout>
            </ProtectedRoute>
          } />

          <Route path="/officer/*" element={
            <ProtectedRoute roles={["officer"]}>
              <DashboardLayout>
                <Routes>
                  <Route path="/" element={<OfficerDashboard />} />
                  <Route path="/complaints" element={<OfficerComplaints />} />
                  <Route path="/complaints/:id" element={<ComplaintDetail />} />
                </Routes>
              </DashboardLayout>
            </ProtectedRoute>
          } />

          <Route path="/admin/*" element={
            <ProtectedRoute roles={["admin"]}>
              <DashboardLayout>
                <Routes>
                  <Route path="/" element={<AdminDashboard />} />
                  <Route path="/complaints" element={<AdminComplaints />} />
                  <Route path="/complaints/:id" element={<ComplaintDetail />} />
                  <Route path="/departments" element={<AdminDepartments />} />
                  <Route path="/analytics" element={<AdminAnalytics />} />
                </Routes>
              </DashboardLayout>
            </ProtectedRoute>
          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
