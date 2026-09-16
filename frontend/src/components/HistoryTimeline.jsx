import React from 'react';
import { PlusCircle, UserCheck, RefreshCw, MessageSquare } from 'lucide-react';

const EVENT_CONFIG = {
  created: { icon: PlusCircle, color: 'text-status-new', bg: 'bg-status-new/10' },
  assigned: { icon: UserCheck, color: 'text-status-assigned', bg: 'bg-status-assigned/10' },
  status_changed: { icon: RefreshCw, color: 'text-status-inprogress', bg: 'bg-status-inprogress/10' },
  comment_added: { icon: MessageSquare, color: 'text-ink-muted', bg: 'bg-priority-low/10' }
};

function formatRelativeTime(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  if (diffInSeconds < 60) return 'just now';
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function formatAbsoluteTime(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default function HistoryTimeline({ history = [] }) {
  if (!history || history.length === 0) {
    return (
      <div className="py-8 text-center text-ink-muted bg-surface-muted rounded-md border border-border border-dashed">
        No history yet
      </div>
    );
  }

  return (
    <div className="relative pl-6 border-l border-border space-y-8">
      {history.map((item, index) => {
        const config = EVENT_CONFIG[item.event] || EVENT_CONFIG.comment_added;
        const Icon = config.icon;

        return (
          <div key={index} className="relative">
            {/* Timeline Dot */}
            <div className={`absolute -left-[35px] top-1 w-6 h-6 rounded-full flex items-center justify-center border-4 border-card ${config.bg} ${config.color} shadow-sm`}>
              <Icon size={12} strokeWidth={3} />
            </div>
            
            <div className="flex flex-col sm:flex-row sm:items-start justify-between bg-card rounded-md border border-border shadow-sm p-3 hover:shadow-md transition-shadow">
              <div className="text-sm text-ink mb-1 sm:mb-0">
                {item.detail}
              </div>
              <div className="flex flex-col items-end text-xs text-ink-muted whitespace-nowrap">
                <span className="font-medium">{formatRelativeTime(item.at)}</span>
                <span className="text-[10px] opacity-75">{formatAbsoluteTime(item.at)}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
