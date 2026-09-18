import { useState, useEffect } from "react";
import Sidebar from "./Sidebar.jsx";
import TopBar from "./TopBar.jsx";
import BottomNav from "./BottomNav.jsx";
import NotificationBanner from "../NotificationBanner.jsx";

export default function DashboardLayout({ children }) {
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('civic_sidebar_collapsed') === 'true';
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('civic_sidebar_collapsed', collapsed);
  }, [collapsed]);

  const toggleSidebar = () => setCollapsed(!collapsed);
  const toggleMobile = () => setMobileOpen(!mobileOpen);

  // Use inline style for CSS-variable-based padding (Tailwind v4 can't JIT arbitrary var() values)
  const mainPadding = {
    paddingLeft: collapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)',
  };

  return (
    <div className="flex min-h-screen bg-bg">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar collapsed={collapsed} onToggle={toggleSidebar} />
      </div>

      {/* Mobile Sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={toggleMobile} />
          <div className="absolute left-0 top-0 h-full shadow-xl" style={{ width: 'var(--sidebar-width)' }}>
            <Sidebar collapsed={false} onToggle={toggleMobile} />
          </div>
        </div>
      )}

      {/* Main content area — inline style avoids Tailwind v4 JIT arbitrary-value issue */}
      <div
        className="flex min-w-0 flex-1 flex-col transition-[padding] duration-300"
        style={typeof window !== 'undefined' && window.innerWidth >= 768 ? mainPadding : {}}
      >
        <TopBar onMenuClick={toggleMobile} onToggleSidebar={toggleSidebar} sidebarCollapsed={collapsed} />
        <NotificationBanner />
        <main className="flex-1 p-4 md:p-6 lg:p-8 pb-24 md:pb-8">
          <div className="mx-auto max-w-6xl">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Persistent Bottom Navigation */}
      <BottomNav />
    </div>
  );
}

