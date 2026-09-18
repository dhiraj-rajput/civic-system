import { LayoutDashboard, FilePlus, ClipboardList, Inbox, Building2, BarChart3, PanelLeftClose, PanelLeft, LogOut } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { CivicEmblem } from "../CivicLogo.jsx";

const NAV_CONFIG = {
  citizen: [
    { to: '/citizen', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/citizen/submit', label: 'Submit Issue', icon: FilePlus },
    { to: '/citizen/complaints', label: 'My Complaints', icon: ClipboardList },
  ],
  officer: [
    { to: '/officer', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/officer/complaints', label: 'My Queue', icon: Inbox },
  ],
  admin: [
    { to: '/admin', label: 'Overview', icon: LayoutDashboard },
    { to: '/admin/complaints', label: 'All Complaints', icon: ClipboardList },
    { to: '/admin/departments', label: 'Departments', icon: Building2 },
    { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  ],
};

export default function Sidebar({ collapsed, onToggle }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navItems = user ? NAV_CONFIG[user.role] || [] : [];
  const currentPath = location.pathname;

  return (
    <aside 
      className={`fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-sidebar-hover bg-sidebar text-sidebar-text transition-all duration-300 ${collapsed ? 'w-[var(--sidebar-collapsed)]' : 'w-[var(--sidebar-width)]'}`}
    >
      <div className="flex h-[var(--topbar-height)] shrink-0 items-center justify-between border-b border-sidebar-hover px-3.5">
        {!collapsed && (
          <Link to="/" className="flex items-center gap-2 font-display text-lg font-semibold text-white group">
            <CivicEmblem size={26} />
            <div className="flex items-center gap-1 leading-none">
              <span className="text-white font-bold tracking-tight text-base font-serif">Civic</span>
              <span className="text-amber-400 font-bold tracking-tight text-base font-serif">Portal</span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-400/15 text-amber-300 border border-amber-400/30 font-semibold ml-1">311</span>
            </div>
          </Link>
        )}
        {collapsed && (
          <Link to="/" className="mx-auto flex items-center justify-center" title="CivicPortal">
            <CivicEmblem size={26} />
          </Link>
        )}
        {!collapsed && (
          <button onClick={onToggle} className="rounded p-1.5 text-sidebar-text hover:bg-sidebar-hover hover:text-white transition-colors">
            <PanelLeftClose size={18} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        <nav className="space-y-1 px-2">
          {navItems.map((item) => {
            const isActive = currentPath === item.to || currentPath.startsWith(item.to + '/');
            return (
              <Link
                key={item.to}
                to={item.to}
                title={collapsed ? item.label : undefined}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${isActive ? 'bg-sidebar-hover text-sidebar-active border-l-2 border-accent' : 'text-sidebar-text hover:bg-sidebar-hover hover:text-white border-l-2 border-transparent'}`}
              >
                <item.icon size={18} className="shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-sidebar-hover p-4">
        {!collapsed ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sidebar-hover font-medium text-white">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="truncate text-sm font-medium text-white">{user?.name}</span>
                <span className="truncate text-xs text-sidebar-text capitalize">{user?.role}</span>
              </div>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-sidebar-text hover:bg-sidebar-hover hover:text-white transition-colors"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sidebar-hover font-medium text-white" title={user?.name}>
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <button
              onClick={logout}
              title="Logout"
              className="rounded p-2 text-sidebar-text hover:bg-sidebar-hover hover:text-white transition-colors"
            >
              <LogOut size={18} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
