import React, { useState } from "react";
import { Star } from "lucide-react";

export default function StarRating({
  value = 0,
  onChange,
  readOnly = false,
  size = 20,
  className = "",
}) {
  const [hoverValue, setHoverValue] = useState(0);

  const displayValue = hoverValue || value || 0;

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {[1, 2, 3, 4, 5].map((star) => {
        const isFilled = star <= displayValue;
        return (
          <button
            key={star}
            type="button"
            disabled={readOnly}
            onClick={() => onChange && onChange(star)}
            onMouseEnter={() => !readOnly && setHoverValue(star)}
            onMouseLeave={() => !readOnly && setHoverValue(0)}
            className={`transition-all duration-150 ${
              readOnly
                ? "cursor-default"
                : "cursor-pointer hover:scale-110 focus:outline-none focus:ring-1 focus:ring-amber-400 rounded-sm"
            }`}
            title={readOnly ? `${value} out of 5 stars` : `Rate ${star} star${star > 1 ? "s" : ""}`}
          >
            <Star
              size={size}
              className={`transition-colors ${
                isFilled
                  ? "fill-amber-400 text-amber-400 drop-shadow-sm"
                  : "text-slate-300 dark:text-zinc-600 hover:text-amber-300"
              }`}
            />
          </button>
        );
      })}
      {!readOnly && displayValue > 0 && (
        <span className="ml-2 text-xs font-semibold text-amber-600 dark:text-amber-400">
          {displayValue === 5
            ? "5/5 — Excellent"
            : displayValue === 4
            ? "4/5 — Good"
            : displayValue === 3
            ? "3/5 — Satisfactory"
            : displayValue === 2
            ? "2/5 — Needs Work"
            : "1/5 — Unsatisfactory"}
        </span>
      )}
    </div>
  );
}
