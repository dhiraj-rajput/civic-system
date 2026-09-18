import { LayoutDashboard, Building2, BarChart3, FileText, ListChecks, LandPlot } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import Button from "./ui/Button.jsx";
import { useAuth } from "../context/AuthContext.jsx";

import CivicLogo from "./CivicLogo.jsx";

/* Structural top bar (ported from ResolveAI's role-scoped sidebar as a
 * horizontal nav): swaps its link set by role, same as ResolveAI's
 * session-state-driven sidebar did. */
const NAV_BY_ROLE = {
  citizen: [
    { to: "/citizen", label: "Dashboard", icon: LayoutDashboard },
    { to: "/citizen/submit", label: "Submit", icon: FileText },
    { to: "/citizen/complaints", label: "My Complaints", icon: ListChecks },
  ],
  officer: [
    { to: "/officer", label: "Dashboard", icon: LayoutDashboard },
    { to: "/officer/complaints", label: "Assigned Complaints", icon: ListChecks },
  ],
  admin: [
    { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { to: "/admin/complaints", label: "All Complaints", icon: ListChecks },
    { to: "/admin/departments", label: "Departments", icon: Building2 },
    { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
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
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/" className="hover:opacity-90 transition-opacity">
          <CivicLogo size={24} />
        </Link>
        <nav className="flex items-center gap-1 text-sm font-medium text-ink-soft">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="flex items-center gap-1.5 rounded px-2.5 py-1.5 hover:bg-paper hover:text-ink"
            >
              <l.icon size={15} strokeWidth={2} />
              {l.label}
            </Link>
          ))}
          {user ? (
            <>
              <span className="font-ref ml-2 rounded border border-line bg-paper px-2.5 py-1 text-xs text-ink-soft">
                {user.name} · {user.role}
                {user.department ? ` · ${user.department}` : ""}
              </span>
              <Button variant="outline" size="sm" onClick={handleLogout} className="ml-1">
                Logout
              </Button>
            </>
          ) : (
            <>
              <Link to="/login" className="rounded px-2.5 py-1.5 hover:bg-paper hover:text-ink">
                Login
              </Link>
              <Button as={Link} to="/register" variant="accent" size="sm" className="ml-1">
                Register
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
