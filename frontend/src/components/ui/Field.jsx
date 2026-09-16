export function Field({ label, hint, error, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-ink-secondary">{label}</label>
      {children}
      {hint && !error && <p className="text-xs text-ink-muted">{hint}</p>}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

export function TextInput({ leftIcon: LeftIcon, rightElement, ...props }) {
  return (
    <div className="relative flex items-center">
      {LeftIcon && (
        <div className="absolute left-3 text-ink-muted">
          <LeftIcon size={16} />
        </div>
      )}
      <input
        className={`h-11 w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-focus focus:outline-none focus:ring-1 focus:ring-focus transition-all ${
          LeftIcon ? "pl-9" : ""
        } ${rightElement ? "pr-10" : ""}`}
        {...props}
      />
      {rightElement && (
        <div className="absolute right-3 flex items-center">
          {rightElement}
        </div>
      )}
    </div>
  );
}

export function TextArea(props) {
  return (
    <textarea 
      className="min-h-[100px] w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-focus focus:outline-none focus:ring-1 focus:ring-focus transition-all resize-y" 
      {...props} 
    />
  );
}

export function Select({ children, ...props }) {
  return (
    <select 
      className="h-11 w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-ink focus:border-focus focus:outline-none focus:ring-1 focus:ring-focus transition-all" 
      {...props}
    >
      {children}
    </select>
  );
}
