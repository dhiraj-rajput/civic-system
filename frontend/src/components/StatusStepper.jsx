import React from "react";
import { Check, RotateCcw } from "lucide-react";

const STEPS = ["New", "Assigned", "In Progress", "Resolved", "Closed"];

export default function StatusStepper({ currentStatus }) {
  const isReopened = currentStatus === "Reopened";
  const effectiveStatus = isReopened ? "In Progress" : currentStatus;
  const currentIndex = STEPS.indexOf(effectiveStatus) !== -1 ? STEPS.indexOf(effectiveStatus) : 0;

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between w-full relative">
      {/* Connecting lines */}
      <div className="absolute left-4 top-4 bottom-4 w-0.5 sm:hidden bg-border -z-10" />
      <div className="absolute top-4 left-4 right-4 h-0.5 hidden sm:block bg-border -z-10" />

      {STEPS.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isActive = index === currentIndex;

        return (
          <div key={step} className="flex sm:flex-col items-center mb-6 sm:mb-0 relative group">
            {/* Desktop progress line */}
            {index < STEPS.length - 1 && (
              <div
                className={`hidden sm:block absolute top-4 left-1/2 w-full h-0.5 -z-5 transition-colors duration-300 ${
                  isCompleted ? "bg-status-resolved" : "bg-transparent"
                }`}
              />
            )}

            {/* Mobile progress line */}
            {index < STEPS.length - 1 && (
              <div
                className={`sm:hidden absolute left-4 top-8 w-0.5 h-full -z-5 transition-colors duration-300 ${
                  isCompleted ? "bg-status-resolved" : "bg-transparent"
                }`}
              />
            )}

            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                isCompleted
                  ? "bg-status-resolved text-white border-2 border-status-resolved shadow-sm"
                  : isActive
                  ? isReopened
                    ? "bg-rose-500 text-white border-4 border-card shadow-sm"
                    : "bg-brand text-white border-4 border-card shadow-sm"
                  : "bg-card border-2 border-border text-ink-muted"
              }`}
            >
              {isCompleted ? (
                <Check size={15} strokeWidth={2.5} />
              ) : isActive && isReopened ? (
                <RotateCcw size={14} strokeWidth={2.5} />
              ) : isActive ? (
                <Check size={14} strokeWidth={2.5} />
              ) : (
                <div className="w-1.5 h-1.5 rounded-full bg-border" />
              )}
            </div>

            <div
              className={`ml-4 sm:ml-0 sm:mt-2.5 text-xs font-medium transition-colors ${
                isCompleted
                  ? "text-ink"
                  : isActive
                  ? isReopened
                    ? "text-rose-500 font-bold"
                    : "text-brand font-bold"
                  : "text-ink-muted"
              }`}
            >
              {step === "Closed" ? "Closed (Verified)" : step}
              {isActive && isReopened && " (Reopened)"}
            </div>
          </div>
        );
      })}
    </div>
  );
}
