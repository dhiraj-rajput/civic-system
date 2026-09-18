import React from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';

const TONE_MAP = {
  blue: { border: 'border-l-status-new', iconBg: 'bg-status-new/10', iconColor: 'text-status-new' },
  amber: { border: 'border-l-status-assigned', iconBg: 'bg-status-assigned/10', iconColor: 'text-status-assigned' },
  green: { border: 'border-l-status-resolved', iconBg: 'bg-status-resolved/10', iconColor: 'text-status-resolved' },
  red: { border: 'border-l-priority-critical', iconBg: 'bg-priority-critical/10', iconColor: 'text-priority-critical' },
  purple: { border: 'border-l-status-inprogress', iconBg: 'bg-status-inprogress/10', iconColor: 'text-status-inprogress' },
  gray: { border: 'border-l-priority-low', iconBg: 'bg-priority-low/10', iconColor: 'text-priority-low' },
};

export default function StatCard({ label, value, tone = 'gray', icon: Icon, delta, deltaLabel }) {
  const toneStyle = TONE_MAP[tone] || TONE_MAP.gray;

  return (
    <div className={`bg-card rounded-md border border-border border-l-4 shadow-[var(--shadow-card)] p-3.5 sm:p-4 flex flex-col min-w-0 hover:shadow-[var(--shadow-md)] transition-shadow duration-200 ${toneStyle.border}`}>
      <div className="flex items-start justify-between mb-2 gap-1">
        <div className={`p-2 rounded-md shrink-0 ${toneStyle.iconBg} ${toneStyle.iconColor}`}>
          {Icon && <Icon size={20} />}
        </div>
        {delta !== undefined && (
          <div className={`flex items-center text-xs font-medium px-2 py-1 rounded-full shrink-0 ${delta > 0 ? 'bg-success/10 text-success' : delta < 0 ? 'bg-danger/10 text-danger' : 'bg-priority-low/10 text-ink-muted'}`}>
            {delta > 0 ? <ArrowUp size={12} className="mr-1" /> : delta < 0 ? <ArrowDown size={12} className="mr-1" /> : null}
            {Math.abs(delta)}%
          </div>
        )}
      </div>
      <div className="min-w-0">
        <div className="text-2xl sm:text-3xl font-semibold text-ink truncate">{value}</div>
        <div className="mt-1 flex items-center justify-between gap-1 flex-wrap">
          <span className="text-xs sm:text-sm font-medium text-ink-secondary truncate">{label}</span>
          {deltaLabel && <span className="text-[11px] sm:text-xs text-ink-muted shrink-0">{deltaLabel}</span>}
        </div>
      </div>
    </div>
  );
}
