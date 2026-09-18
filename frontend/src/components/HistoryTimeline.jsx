import React from "react";
import { PlusCircle, UserCheck, RefreshCw, MessageSquare, TrendingUp, CheckCircle, ShieldCheck, RotateCcw } from "lucide-react";

const EVENT_CONFIG = {
  created: { icon: PlusCircle, color: "text-blue-500", bg: "bg-blue-500/10" },
  assigned: { icon: UserCheck, color: "text-amber-500", bg: "bg-amber-500/10" },
  status_changed: { icon: RefreshCw, color: "text-purple-500", bg: "bg-purple-500/10" },
  comment_added: { icon: MessageSquare, color: "text-gray-400", bg: "bg-gray-500/10" },
  escalated: { icon: TrendingUp, color: "text-orange-500", bg: "bg-orange-500/10" },
  resolved: { icon: CheckCircle, color: "text-green-500", bg: "bg-green-500/10" },
  verified: { icon: ShieldCheck, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  reopened: { icon: RotateCcw, color: "text-rose-500", bg: "bg-rose-500/10" },
};

function formatRelativeTime(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return "just now";

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatAbsoluteTime(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function HistoryTimeline({ history = [] }) {
  if (!history || history.length === 0) {
    return (
      <div className="py-8 text-center text-ink-muted bg-surface-muted rounded-md border border-border border-dashed text-xs">
        No history yet
      </div>
    );
  }

  return (
    <div className="relative pl-6 border-l border-border space-y-6">
      {history.map((item, index) => {
        const config = EVENT_CONFIG[item.event] || EVENT_CONFIG.status_changed;
        const Icon = config.icon;

        return (
          <div key={index} className="relative">
            {/* Timeline Dot */}
            <div
              className={`absolute -left-[35px] top-1 w-6 h-6 rounded-full flex items-center justify-center border-4 border-card ${config.bg} ${config.color} shadow-sm`}
            >
              <Icon size={11} strokeWidth={2.5} />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-start justify-between bg-card rounded-md border border-border shadow-sm p-3 hover:shadow-md transition-shadow">
              <div className="text-xs text-ink mb-1 sm:mb-0 pr-2">
                {item.detail}
              </div>
              <div className="flex flex-col items-end text-[11px] text-ink-muted whitespace-nowrap shrink-0">
                <span className="font-medium">{formatRelativeTime(item.at)}</span>
                <span className="text-[10px] opacity-70">{formatAbsoluteTime(item.at)}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
