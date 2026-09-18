import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ShieldAlert, Menu, X, LayoutDashboard, MapPin, BarChart2, PlusCircle, LogIn, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import Button from "@/components/ui/Button";

import CivicLogo from "@/components/CivicLogo.jsx";

export function FloatingHeader({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  const links = [
    { label: "Home", href: "/" },
    { label: "Submit Issue", href: "/citizen/submit" },
    { label: "My Complaints", href: "/citizen/complaints" },
    { label: "Analytics & Map", href: "/admin/analytics" },
  ];

  return (
    <header className="sticky top-4 z-50 mx-auto w-full max-w-5xl px-4">
      <div className="rounded-2xl border border-border/80 bg-card/85 backdrop-blur-md shadow-lg shadow-black/20 p-2 sm:px-4">
        <nav className="flex items-center justify-between">
          
          {/* Logo */}
          <Link to="/" className="flex items-center px-2 py-1 rounded-lg hover:opacity-90 transition-opacity">
            <CivicLogo size={28} />
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-1">
            {links.map((link) => {
              const active = location.pathname === link.href;
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                    active
                      ? "bg-brand/10 text-brand border border-brand/20 shadow-sm"
                      : "text-ink-secondary hover:text-ink hover:bg-surface-hover"
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* User Status / CTA */}
          <div className="flex items-center gap-2">
            {user ? (
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline-block text-xs font-medium text-ink bg-surface-muted px-2.5 py-1 rounded-full border border-border">
                  {user.name} ({user.role})
                </span>
                <Button variant="ghost" size="sm" onClick={onLogout} className="text-xs">
                  <LogOut size={14} /> Logout
                </Button>
              </div>
            ) : (
              <Link to="/login">
                <Button variant="primary" size="sm" className="text-xs flex items-center gap-1.5">
                  <LogIn size={13} /> Sign In
                </Button>
              </Link>
            )}

            {/* Mobile Toggle */}
            <button
              type="button"
              onClick={() => setOpen(!open)}
              className="p-1.5 rounded-lg md:hidden text-ink-secondary hover:text-ink hover:bg-surface-hover border border-border"
            >
              {open ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </nav>

        {/* Mobile Dropdown Menu */}
        {open && (
          <div className="md:hidden mt-2 pt-2 border-t border-border flex flex-col gap-1 pb-1">
            {links.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                onClick={() => setOpen(false)}
                className="px-3 py-2 rounded-md text-xs font-medium text-ink hover:bg-surface-hover"
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}
