import React, { useState, useEffect, useRef, useCallback } from "react";
import { Bell, Check, ExternalLink, Info, AlertTriangle, CheckCircle2, ShieldAlert, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "./ui/Toast.jsx";

export default function NotificationBell() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const lastKnownIds = useRef(new Set());
  const initialLoadRef = useRef(true);

  const fetchNotifications = useCallback(async (isBackground = false) => {
    if (!user) return;
    try {
      const data = await api.get("/notifications?limit=25");
      const list = data.notifications || [];
      const unread = data.unread_count || 0;

      // Detect newly arrived notifications for in-app toast alerts
      if (!initialLoadRef.current && isBackground) {
        list.forEach((n) => {
          if (!n.read && !lastKnownIds.current.has(n.id)) {
            toast.info(`🔔 ${n.title}: ${n.message}`);
            // If browser notifications are permitted, trigger desktop notification
            if (window.Notification && Notification.permission === "granted") {
              try {
                new Notification(n.title, { body: n.message, icon: "/favicon.ico" });
              } catch (e) {
                // ignore
              }
            }
          }
        });
      }

      // Update known ids
      lastKnownIds.current = new Set(list.map((n) => n.id));
      initialLoadRef.current = false;
      setNotifications(list);
      setUnreadCount(unread);
    } catch (e) {
      // Quiet background polling error
    }
  }, [user, toast]);

  // Initial fetch and polling loop
  useEffect(() => {
    fetchNotifications(false);
    const interval = setInterval(() => {
      fetchNotifications(true);
    }, 20000); // Poll every 20s

    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id, e) => {
    e?.stopPropagation();
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      // Quiet fail
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.post("/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
      toast.success("All notifications marked as read");
    } catch (err) {
      toast.error("Failed to mark all as read");
    }
  };

  const requestDesktopPermission = async () => {
    if ("Notification" in window) {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        toast.success("Desktop push alerts enabled!");
      }
    }
  };

  const handleNotificationClick = (n) => {
    if (!n.read) {
      handleMarkAsRead(n.id);
    }
    setIsOpen(false);

    if (n.complaint_id) {
      // Determine destination by role
      if (user?.role === "citizen") {
        navigate(`/citizen/complaints/${n.complaint_id}`);
      } else if (user?.role === "officer") {
        navigate(`/officer/complaints/${n.complaint_id}`);
      } else {
        navigate(`/admin/complaints`);
      }
    }
  };

  const formatTime = (dateStr) => {
    const diff = Math.floor((new Date() - new Date(dateStr)) / 1000);
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const getIcon = (type) => {
    switch (type) {
      case "success":
        return <CheckCircle2 size={15} className="text-emerald-500 shrink-0 mt-0.5" />;
      case "warning":
        return <AlertTriangle size={15} className="text-amber-500 shrink-0 mt-0.5" />;
      case "alert":
        return <ShieldAlert size={15} className="text-red-500 shrink-0 mt-0.5" />;
      default:
        return <Info size={15} className="text-blue-500 shrink-0 mt-0.5" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative rounded-full p-2 text-ink-secondary hover:bg-hover hover:text-ink transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400"
        title="Stay Informed — System Notifications"
      >
        <Bell size={19} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-card animate-in zoom-in">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="fixed sm:absolute right-3 sm:right-0 left-3 sm:left-auto top-14 sm:top-auto sm:mt-2 max-w-sm sm:w-96 origin-top-right rounded-xl border border-border bg-card shadow-2xl ring-1 ring-black/5 z-50 animate-in fade-in-50 zoom-in-95 duration-150 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border bg-surface-muted/50 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-ink">Notifications</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[11px] font-bold text-red-600 dark:text-red-400">
                  {unreadCount} unread
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="text-xs font-medium text-brand hover:underline"
                >
                  Mark all read
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-ink-muted hover:text-ink"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-border/60">
            {notifications.length === 0 ? (
              <div className="py-10 text-center text-xs text-ink-muted">
                No notifications right now.
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`flex items-start justify-between gap-3 p-3.5 transition-colors cursor-pointer hover:bg-hover ${
                    !n.read ? "bg-amber-500/5 dark:bg-amber-400/5" : ""
                  }`}
                >
                  <div className="flex items-start gap-2.5 flex-1 min-w-0">
                    {getIcon(n.type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-xs truncate ${!n.read ? "font-bold text-ink" : "font-medium text-ink-secondary"}`}>
                          {n.title}
                        </span>
                        <span className="text-[10px] text-ink-muted shrink-0">
                          {formatTime(n.created_at)}
                        </span>
                      </div>
                      <p className="text-xs text-ink-muted line-clamp-2 mt-0.5 leading-snug">
                        {n.message}
                      </p>
                      {n.complaint_id && (
                        <div className="mt-1 flex items-center gap-1 font-mono text-[10px] text-brand">
                          <span>Case #{n.complaint_id}</span>
                          <ExternalLink size={10} />
                        </div>
                      )}
                    </div>
                  </div>

                  {!n.read && (
                    <button
                      type="button"
                      onClick={(e) => handleMarkAsRead(n.id, e)}
                      className="text-ink-muted hover:text-ink shrink-0 p-1 rounded hover:bg-surface-input"
                      title="Mark as read"
                    >
                      <Check size={14} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {"Notification" in window && Notification.permission !== "granted" && (
            <div className="border-t border-border bg-surface-muted/30 p-2 text-center">
              <button
                type="button"
                onClick={requestDesktopPermission}
                className="text-[11px] font-semibold text-brand hover:underline"
              >
                🔔 Enable browser push notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
