import React, { useEffect, useState } from 'react';
import { Sparkles, X, Check } from 'lucide-react';

export default function AISuggestion({ suggestion, onAccept, onDismiss, onApplyCategory }) {
  const [isVisible, setIsVisible] = useState(false);
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    if (suggestion && suggestion.confidence > 0.4) {
      setApplied(false);
      // Small delay for entrance animation
      const timer = setTimeout(() => setIsVisible(true), 10);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [suggestion]);

  if (!suggestion || suggestion.confidence <= 0.4) {
    return null;
  }

  const confidencePercent = Math.round(suggestion.confidence * 100);

  const handleApply = () => {
    const cat = suggestion.category;
    if (onAccept) onAccept(cat);
    if (onApplyCategory) onApplyCategory(cat);
    setApplied(true);
    setTimeout(() => {
      if (onDismiss) onDismiss();
    }, 1200);
  };

  return (
    <div 
      className={`mt-2 flex items-center justify-between p-3 rounded-lg border border-accent/30 bg-accent/5 shadow-sm transition-all duration-300 ease-out transform ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 flex-1">
        <div className="flex items-center gap-2 text-accent-dark">
          <Sparkles size={16} className="animate-pulse" />
          <span className="font-semibold text-sm">AI suggests:</span>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-ink-secondary">
          <span className="font-medium px-2 py-0.5 rounded-md bg-card border border-border">
            {suggestion.category}
          </span>
          <span className="text-ink-muted">•</span>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            suggestion.urgency_level === 'HIGH' || suggestion.urgency_level === 'CRITICAL' 
              ? 'bg-danger/10 text-danger' : 
            suggestion.urgency_level === 'MEDIUM' 
              ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'
          }`}>
            {suggestion.urgency_level} Priority
          </span>
        </div>
        
        <div className="text-xs text-ink-muted sm:ml-auto">
          {confidencePercent}% confident
        </div>
      </div>
      
      <div className="flex items-center gap-1 ml-4 border-l border-border/50 pl-4">
        <button
          type="button"
          onClick={handleApply}
          className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white rounded-md transition-all shadow-sm ${
            applied 
              ? "bg-emerald-600 hover:bg-emerald-700" 
              : "bg-accent-dark hover:bg-accent cursor-pointer"
          }`}
          title="Apply Suggestion"
        >
          <Check size={14} />
          <span>{applied ? "Applied!" : "Apply"}</span>
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="p-1.5 text-ink-muted hover:text-ink hover:bg-surface-hover rounded-md transition-colors"
          title="Dismiss"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
