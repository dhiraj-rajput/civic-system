import React from "react";

export function CivicEmblem({ size = 28, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
    >
      {/* Outer Shield */}
      <path
        d="M16 2.5L5 6.5V15.5C5 22.5 9.8 28.9 16 30.5C22.2 28.9 27 22.5 27 15.5V6.5L16 2.5Z"
        className="fill-slate-900 dark:fill-amber-500"
      />
      {/* Inner Accent Crest */}
      <path
        d="M16 5.5L7.5 8.7V15.5C7.5 21 11.2 26 16 27.5C20.8 26 24.5 21 24.5 15.5V8.7L16 5.5Z"
        className="stroke-slate-700 dark:stroke-amber-400 fill-slate-800 dark:fill-[#121214]"
        strokeWidth="1.2"
      />
      {/* Municipal Building Pillars */}
      <path
        d="M11 20V14.5H13.5V20M14.75 20V12H17.25V20M18.5 20V14.5H21V20"
        className="stroke-white dark:stroke-amber-400"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Pin dot */}
      <circle cx="16" cy="9.5" r="1.5" className="fill-white dark:fill-amber-400" />
    </svg>
  );
}

export function CivicLogo({ size = 28, showText = true, className = "", textClassName = "" }) {
  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      <CivicEmblem size={size} />
      {showText && (
        <div className={`flex items-center gap-1.5 leading-none ${textClassName}`}>
          <span className="text-slate-900 dark:text-white font-bold tracking-tight text-base font-serif">Civic</span>
          <span className="text-slate-600 dark:text-amber-400 font-semibold tracking-tight text-base font-serif">Portal</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-amber-400/10 text-slate-700 dark:text-amber-400 border border-slate-200 dark:border-amber-400/30 font-semibold ml-0.5">
            311
          </span>
        </div>
      )}
    </div>
  );
}

export default CivicLogo;
