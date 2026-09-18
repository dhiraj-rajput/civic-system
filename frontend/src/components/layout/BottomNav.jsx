import React from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, FilePlus, ClipboardList, 
  Inbox, MapPin, Building2, BarChart3, Search
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function BottomNav() {
  const { user } = useAuth();
  const location = useLocation();
  const currentPath = location.pathname;

  if (!user) return null;

  const NAV_CONFIG = {
    citizen: [
      { to: "/citizen", label: "Home", icon: LayoutDashboard },
      { to: "/citizen/complaints", label: "My Reports", icon: ClipboardList },
      { to: "/citizen/submit", label: "Report", icon: FilePlus, isPrimary: true },
      { to: "/track", label: "Track", icon: Search },
    ],
    officer: [
      { to: "/officer", label: "Dashboard", icon: LayoutDashboard },
      { to: "/officer/complaints", label: "Work Queue", icon: Inbox },
      { to: "/track", label: "Track 311", icon: Search },
    ],
    admin: [
      { to: "/admin", label: "Overview", icon: LayoutDashboard },
      { to: "/admin/complaints", label: "Complaints", icon: ClipboardList },
      { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
      { to: "/admin/departments", label: "Depts", icon: Building2 },
    ],
  };

  const items = NAV_CONFIG[user.role] || [];

  return (
    <nav 
      aria-label="Mobile Bottom Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border px-2 py-1.5 shadow-lg flex items-center justify-around"
    >
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = currentPath === item.to || (item.to !== "/citizen" && item.to !== "/officer" && item.to !== "/admin" && currentPath.startsWith(item.to));

        if (item.isPrimary) {
          return (
            <Link
              key={item.to}
              to={item.to}
              className="flex flex-col items-center -mt-5 group"
            >
              <div className="w-11 h-11 rounded-full bg-brand text-white shadow-md flex items-center justify-center group-hover:scale-105 transition-transform ring-4 ring-bg">
                <Icon size={20} />
              </div>
              <span className="text-[10px] font-semibold text-brand mt-0.5">
                {item.label}
              </span>
            </Link>
          );
        }

        return (
          <Link
            key={item.to}
            to={item.to}
            className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-lg transition-colors ${
              isActive 
                ? "text-brand font-bold" 
                : "text-ink-muted hover:text-ink"
            }`}
          >
            <Icon size={18} className={isActive ? "text-brand" : "text-ink-muted"} />
            <span className="text-[10px] tracking-tight">
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
