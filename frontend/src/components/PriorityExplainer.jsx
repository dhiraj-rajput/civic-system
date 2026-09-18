import React, { useState } from "react";
import { HelpCircle, X, TrendingUp, AlertTriangle, Clock, ShieldAlert, Layers } from "lucide-react";
import { PriorityBadge } from "./Badges";

export default function PriorityExplainer({
  priorityLabel = "Low",
  priorityScore = 0.0,
  breakdown = null,
  escalationHistory = [],
}) {
  const [open, setOpen] = useState(false);

  const b = breakdown || {
    age_hours: 0,
    age_factor: 10,
    category_severity: 30,
    similar_complaints: 1,
    cluster_factor: 10,
    safety_factor: 0,
    sla_urgency: 0,
    summary: "Base rule-based civic priority score.",
  };

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className="inline-flex items-center gap-1 text-xs text-ink-muted hover:text-brand transition-colors bg-surface-muted/60 hover:bg-brand/10 border border-border px-2 py-0.5 rounded-full cursor-pointer"
        title="Why is this priority?"
      >
        <HelpCircle size={13} className="text-brand" />
        <span className="font-medium">Why this priority?</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={(e) => {
            e.stopPropagation();
            setOpen(false);
          }}
        >
          <div
            className="relative w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-2xl space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-3">
                <PriorityBadge priority={priorityLabel} />
                <div>
                  <h3 className="text-base font-bold text-ink">Explainable Priority Engine</h3>
                  <div className="text-xs text-ink-muted">Overall Score: {priorityScore} / 100</div>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-ink-muted hover:bg-surface-hover hover:text-ink"
              >
                <X size={18} />
              </button>
            </div>

            {/* Explanation Summary */}
            <div className="rounded-lg bg-brand/5 border border-brand/20 p-3.5 text-xs text-ink leading-relaxed">
              <strong>Summary: </strong> {b.summary || "Calculated from severity, complaint age, and cluster size."}
            </div>

            {/* Factors Breakdown */}
            <div className="space-y-3.5">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                Contributing Factor Scores
              </h4>

              {/* Category Severity */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-medium text-ink">
                  <span className="flex items-center gap-1.5">
                    <AlertTriangle size={13} className="text-amber-500" /> Category Base Severity
                  </span>
                  <span>{b.category_severity}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-surface-muted overflow-hidden">
                  <div className="h-full rounded-full bg-amber-500" style={{ width: `${b.category_severity}%` }} />
                </div>
              </div>

              {/* Similar Complaints Cluster */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-medium text-ink">
                  <span className="flex items-center gap-1.5">
                    <Layers size={13} className="text-blue-500" /> Cluster Density ({b.similar_complaints} nearby)
                  </span>
                  <span>{b.cluster_factor}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-surface-muted overflow-hidden">
                  <div className="h-full rounded-full bg-blue-500" style={{ width: `${b.cluster_factor}%` }} />
                </div>
              </div>

              {/* Age & SLA Urgency */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-medium text-ink">
                  <span className="flex items-center gap-1.5">
                    <Clock size={13} className="text-purple-500" /> Complaint Age ({b.age_hours}h)
                  </span>
                  <span>{b.age_factor}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-surface-muted overflow-hidden">
                  <div className="h-full rounded-full bg-purple-500" style={{ width: `${b.age_factor}%` }} />
                </div>
              </div>

              {/* Safety Risk Boost */}
              {b.safety_factor > 0 && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-medium text-ink">
                    <span className="flex items-center gap-1.5 text-danger font-semibold">
                      <ShieldAlert size={13} /> Safety Hazard Multiplier
                    </span>
                    <span className="text-danger font-bold">+{b.safety_factor}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-surface-muted overflow-hidden">
                    <div className="h-full rounded-full bg-red-500" style={{ width: `${Math.min(100, b.safety_factor)}%` }} />
                  </div>
                </div>
              )}
            </div>

            {/* Escalation History */}
            {escalationHistory && escalationHistory.length > 0 && (
              <div className="space-y-2 pt-3 border-t border-border">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-muted flex items-center gap-1.5">
                  <TrendingUp size={13} className="text-warning" /> Priority Escalation Log
                </h4>
                <div className="space-y-2 max-h-36 overflow-y-auto">
                  {escalationHistory.map((esc, i) => (
                    <div key={i} className="rounded border border-border bg-surface-muted/40 p-2 text-xs">
                      <div className="flex items-center justify-between font-medium text-ink">
                        <span>
                          {esc.old_priority} → <strong className="text-brand">{esc.new_priority}</strong>
                        </span>
                        <span className="text-[10px] text-ink-muted">
                          {new Date(esc.at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="text-[11px] text-ink-secondary mt-0.5">{esc.reason}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md bg-surface-muted px-4 py-2 text-xs font-medium text-ink hover:bg-surface-hover border border-border"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
