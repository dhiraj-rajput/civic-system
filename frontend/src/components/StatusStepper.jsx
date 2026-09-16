import React from 'react';
import { Check } from 'lucide-react';

const STEPS = ['New', 'Assigned', 'In Progress', 'Resolved'];

export default function StatusStepper({ currentStatus }) {
  const currentIndex = STEPS.indexOf(currentStatus) !== -1 ? STEPS.indexOf(currentStatus) : 0;

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between w-full relative">
      {/* Connecting lines for mobile (vertical) and desktop (horizontal) */}
      <div className="absolute left-4 top-4 bottom-4 w-0.5 sm:hidden bg-border -z-10" />
      <div className="absolute top-4 left-4 right-4 h-0.5 hidden sm:block bg-border -z-10" />

      {STEPS.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isActive = index === currentIndex;
        const isFuture = index > currentIndex;

        return (
          <div key={step} className="flex sm:flex-col items-center mb-6 sm:mb-0 relative group">
            {/* Desktop progress line overlay */}
            {index < STEPS.length - 1 && (
              <div 
                className={`hidden sm:block absolute top-4 left-1/2 w-full h-0.5 -z-5 transition-colors duration-300 ${isCompleted ? 'bg-status-resolved' : 'bg-transparent'}`} 
              />
            )}
            
            {/* Mobile progress line overlay */}
            {index < STEPS.length - 1 && (
              <div 
                className={`sm:hidden absolute left-4 top-8 w-0.5 h-full -z-5 transition-colors duration-300 ${isCompleted ? 'bg-status-resolved' : 'bg-transparent'}`} 
              />
            )}

            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
              isCompleted ? 'bg-status-resolved text-white border-2 border-status-resolved shadow-sm' :
              isActive ? 'bg-status-new text-white border-4 border-[var(--surface-bg)] shadow-[0_0_0_2px_var(--status-new)]' :
              'bg-card border-2 border-border text-ink-muted'
            }`}>
              {(isCompleted || isActive) ? <Check size={16} strokeWidth={3} /> : <div className="w-2 h-2 rounded-full bg-border group-hover:bg-ink-muted transition-colors" />}
            </div>
            
            <div className={`ml-4 sm:ml-0 sm:mt-3 text-sm font-medium transition-colors ${
              isCompleted ? 'text-ink' :
              isActive ? 'text-brand' :
              'text-ink-muted'
            }`}>
              {step}
            </div>
          </div>
        );
      })}
    </div>
  );
}
