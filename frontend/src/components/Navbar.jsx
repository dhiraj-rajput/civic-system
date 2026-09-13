import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext.jsx";

/* Ported from ResolveAI's sidebar: it swaps the nav-link set based on
 * st.session_state role (user / department / admin). Here the same idea as
 * a top navbar with role-scoped links for citizen / officer / admin. */

const NAV_BY_ROLE = {
  citizen: [
    { to: "/citizen", label: "Dashboard" },
    { to: "/citizen/submit", label: "Submit Complaint" },
    { to: "/citizen/complaints", label: "My Complaints" },
  ],
  officer: [
    { to: "/officer", label: "Dashboard" },
    { to: "/officer/complaints", label: "Assigned Complaints" },
  ],
  admin: [
    { to: "/admin", label: "Dashboard" },
    { to: "/admin/complaints", label: "All Complaints" },
    { to: "/admin/departments", label: "Departments" },
    { to: "/admin/analytics", label: "Analytics" },
  ],
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const links = user ? NAV_BY_ROLE[user.role] || [] : [];

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/" className="text-lg font-bold text-slate-900">
          🏙️ Civic Complaint Portal
        </Link>
        <nav className="flex items-center gap-4 text-sm font-medium text-slate-600">
          {links.map((l) => (
            <Link key={l.to} to={l.to} className="hover:text-slate-900">
              {l.label}
            </Link>
          ))}
          {user ? (
            <>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                {user.name} · {user.role}
                {user.department ? ` · ${user.department}` : ""}
              </span>
              <button
                onClick={handleLogout}
                className="rounded-md bg-slate-900 px-3 py-1.5 text-white hover:bg-slate-700"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="hover:text-slate-900">
                Login
              </Link>
              <Link
                to="/register"
                className="rounded-md bg-slate-900 px-3 py-1.5 text-white hover:bg-slate-700"
              >
                Register
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
