import React from "react";
import { Check, RotateCcw, Clock } from "lucide-react";

const STEPS = [
  { name: "New", desc: "Complaint registered in system" },
  { name: "Assigned", desc: "Routed to responsible agency or officer" },
  { name: "In Progress", desc: "Field work or inspection underway" },
  { name: "Resolved", desc: "Remediation verified with evidence" },
  { name: "Closed", desc: "Citizen verification or final audit complete" },
];

export default function StatusStepper({ currentStatus, orientation = "vertical" }) {
  const isReopened = currentStatus === "Reopened";
  const effectiveStatus = isReopened ? "In Progress" : currentStatus;
  const stepNames = STEPS.map((s) => s.name);
  const currentIndex = stepNames.indexOf(effectiveStatus) !== -1 ? stepNames.indexOf(effectiveStatus) : 0;

  if (orientation === "vertical") {
    return (
      <div className="flex flex-col w-full py-1">
        {STEPS.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isActive = index === currentIndex;

          return (
            <div key={step.name} className="flex items-start relative pb-5 last:pb-0 group">
              {/* Connecting vertical line */}
              {index < STEPS.length - 1 && (
                <div
                  className={`absolute left-4 top-8 bottom-0 w-0.5 -translate-x-1/2 transition-colors duration-300 ${
                    index < currentIndex
                      ? "bg-emerald-500 dark:bg-emerald-600"
                      : "bg-border dark:bg-zinc-800"
                  }`}
                />
              )}

              {/* Circle Icon */}
              <div
                className={`relative z-10 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isCompleted
                    ? "bg-emerald-500 text-white shadow-sm ring-4 ring-emerald-500/15"
                    : isActive
                    ? isReopened
                      ? "bg-rose-500 text-white ring-4 ring-rose-500/20 font-bold"
                      : "bg-amber-500 text-white ring-4 ring-amber-500/20 font-bold"
                    : "bg-card border-2 border-border text-ink-muted"
                }`}
              >
                {isCompleted ? (
                  <Check size={15} strokeWidth={2.5} />
                ) : isActive && isReopened ? (
                  <RotateCcw size={14} strokeWidth={2.5} />
                ) : isActive ? (
                  <Clock size={14} strokeWidth={2.5} />
                ) : (
                  <span className="text-xs font-semibold">{index + 1}</span>
                )}
              </div>

              {/* Label & Description */}
              <div className="ml-3.5 min-w-0 flex-1 pt-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`text-xs font-semibold leading-tight ${
                      isCompleted
                        ? "text-ink"
                        : isActive
                        ? isReopened
                          ? "text-rose-500 font-bold"
                          : "text-amber-500 dark:text-amber-400 font-bold"
                        : "text-ink-muted"
                    }`}
                  >
                    {step.name === "Closed" ? "Closed (Verified)" : step.name}
                    {isActive && isReopened && " (Reopened)"}
                  </span>
                  {isActive && (
                    <span
                      className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-full ${
                        isReopened
                          ? "bg-rose-500/10 text-rose-500 border border-rose-500/30"
                          : "bg-amber-500/10 text-amber-500 dark:text-amber-400 border border-amber-500/30"
                      }`}
                    >
                      Current
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-ink-muted mt-0.5 leading-normal">
                  {step.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Horizontal layout for wide unobstructed viewports
  return (
    <div className="w-full">
      <div className="flex items-center justify-between w-full relative">
        {/* Background track line */}
        <div className="absolute top-4 left-4 right-4 h-0.5 bg-border -z-0" />
        {/* Completed progress line */}
        <div
          className="absolute top-4 left-4 h-0.5 bg-emerald-500 transition-all duration-500 -z-0"
          style={{
            width: `calc(${(Math.min(currentIndex, STEPS.length - 1) / (STEPS.length - 1)) * 100}% - 2rem)`,
          }}
        />

        {STEPS.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isActive = index === currentIndex;

          return (
            <div key={step.name} className="flex flex-col items-center relative z-10 group">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isCompleted
                    ? "bg-emerald-500 text-white shadow-sm ring-4 ring-emerald-500/15"
                    : isActive
                    ? isReopened
                      ? "bg-rose-500 text-white ring-4 ring-rose-500/20"
                      : "bg-amber-500 text-white ring-4 ring-amber-500/20"
                    : "bg-card border-2 border-border text-ink-muted"
                }`}
              >
                {isCompleted ? (
                  <Check size={14} strokeWidth={2.5} />
                ) : isActive && isReopened ? (
                  <RotateCcw size={14} strokeWidth={2.5} />
                ) : isActive ? (
                  <Clock size={14} strokeWidth={2.5} />
                ) : (
                  <span className="text-xs font-semibold">{index + 1}</span>
                )}
              </div>

              <div
                className={`mt-2 text-[11px] text-center font-medium max-w-[80px] truncate ${
                  isCompleted
                    ? "text-ink"
                    : isActive
                    ? isReopened
                      ? "text-rose-500 font-bold"
                      : "text-amber-500 dark:text-amber-400 font-bold"
                    : "text-ink-muted"
                }`}
                title={step.name}
              >
                {step.name}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
