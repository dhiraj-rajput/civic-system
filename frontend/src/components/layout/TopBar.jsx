import { Menu, User, LogOut } from "lucide-react";
import ThemeToggle from "../ui/ThemeToggle.jsx";
import NotificationBell from "../NotificationBell.jsx";
import { CivicEmblem } from "../CivicLogo.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";

export default function TopBar({ onMenuClick }) {
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-[var(--topbar-height)] items-center justify-between border-b border-border bg-card px-4 shadow-sm md:px-6">
      <div className="flex items-center gap-2.5">
        <button
          onClick={onMenuClick}
          aria-label="Open navigation sidebar"
          className="rounded-lg p-2 text-ink-secondary hover:bg-surface hover:text-ink md:hidden"
        >
          <Menu size={20} />
        </button>
        <div className="flex items-center gap-2 md:hidden">
          <CivicEmblem className="w-5 h-5 text-brand" />
          <span className="font-serif font-bold text-sm tracking-tight text-ink">CivicPortal</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <NotificationBell />
        <ThemeToggle />
        
        {user && (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-white dark:bg-amber-400 dark:text-slate-950 font-bold shadow-sm ring-2 ring-transparent transition-all hover:ring-focus focus:outline-none focus:ring-focus"
            >
              {user.name.charAt(0).toUpperCase()}
            </button>
            
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 origin-top-right rounded-md border border-border bg-card py-1 shadow-md ring-1 ring-black ring-opacity-5">
                <div className="border-b border-border px-4 py-2">
                  <p className="truncate text-sm font-medium text-ink">{user.name}</p>
                  <p className="truncate text-xs text-ink-muted capitalize">{user.role}</p>
                </div>
                <button
                  onClick={logout}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-ink hover:bg-hover"
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
