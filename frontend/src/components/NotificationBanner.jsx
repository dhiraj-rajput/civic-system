import React, { useState, useEffect } from "react";
import { Bell, X, ArrowRight, ExternalLink, ShieldAlert } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "@/api/client";
import { useAuth } from "@/context/AuthContext";

export default function NotificationBanner() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [unreadList, setUnreadList] = useState([]);
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!user) return;

    // Check if banner was already shown in this login session
    const sessionSeenKey = `civic_notif_banner_seen_${user.id}`;
    const alreadySeen = sessionStorage.getItem(sessionSeenKey);

    const checkUnattended = async () => {
      try {
        const data = await api.get("/notifications?limit=10");
        const unread = (data.notifications || []).filter((n) => !n.read);

        if (unread.length > 0 && !alreadySeen) {
          setUnreadList(unread);
          setVisible(true);
          sessionStorage.setItem(sessionSeenKey, "true");
        }
      } catch (err) {
        // silent fail
      }
    };

    checkUnattended();
  }, [user]);

  // Auto-dismiss countdown timer (8 seconds)
  useEffect(() => {
    if (!visible) return;

    const duration = 8000;
    const intervalTime = 100;
    const step = (intervalTime / duration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev <= step) {
          clearInterval(timer);
          setVisible(false);
          return 0;
        }
        return prev - step;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [visible]);

  if (!visible || unreadList.length === 0) {
    return null;
  }

  const latest = unreadList[0];
  const count = unreadList.length;

  const handleAction = () => {
    setVisible(false);
    if (latest.complaint_id) {
      if (user?.role === "citizen") {
        navigate(`/citizen/complaints/${latest.complaint_id}`);
      } else if (user?.role === "officer") {
        navigate(`/officer/complaints/${latest.complaint_id}`);
      } else {
        navigate(`/admin/complaints`);
      }
    }
  };

  return (
    <div className="fixed top-20 right-4 sm:right-6 z-50 max-w-sm sm:max-w-md w-full animate-in slide-in-from-top-4 fade-in duration-300">
      <div className="relative overflow-hidden rounded-2xl border border-brand/30 bg-card/95 p-4 shadow-2xl backdrop-blur-md ring-1 ring-black/5 dark:ring-white/10">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-full bg-brand/10 p-2 text-brand shrink-0">
            <Bell size={18} className="animate-bounce" />
          </div>

          <div className="flex-1 min-w-0 pr-6">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-brand">
                Unattended Updates ({count})
              </span>
            </div>
            <p className="mt-1 text-xs font-semibold text-ink truncate">
              {latest.title}
            </p>
            <p className="mt-0.5 text-xs text-ink-secondary line-clamp-2 leading-relaxed">
              {latest.message}
            </p>

            <div className="mt-2.5 flex items-center gap-3">
              <button
                onClick={handleAction}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-brand hover:underline"
              >
                Review Now <ArrowRight size={13} />
              </button>
            </div>
          </div>

          <button
            onClick={() => setVisible(false)}
            aria-label="Dismiss banner"
            className="absolute top-3 right-3 rounded-md p-1 text-ink-muted hover:bg-hover hover:text-ink transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Dismiss progress indicator bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-brand/10">
          <div
            className="h-full bg-brand transition-all duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
