import { BrowserRouter, Link, Route, Routes } from "react-router-dom";

import AdminDashboard from "./pages/admin/Dashboard.jsx";
import CitizenSubmit from "./pages/citizen/Submit.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <nav style={{ padding: 12 }}>
        <Link to="/">Submit a complaint</Link> | <Link to="/admin">Admin dashboard</Link>
      </nav>
      <Routes>
        <Route path="/" element={<CitizenSubmit />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}
