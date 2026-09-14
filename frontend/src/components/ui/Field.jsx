/* Form primitives. One consistent look for every input in the app instead
 * of re-typing border/padding/focus classes on each page. */
export function Field({ label, hint, error, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-ink">{label}</label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-ink-soft">{hint}</p>}
      {error && <p className="mt-1 text-xs text-brick">{error}</p>}
    </div>
  );
}

const fieldClass =
  "mt-1 w-full rounded border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-soft/60 focus:border-steel focus:outline-none focus:ring-1 focus:ring-steel";

export function TextInput(props) {
  return <input className={fieldClass} {...props} />;
}

export function TextArea(props) {
  return <textarea className={fieldClass} {...props} />;
}

export function Select({ children, ...props }) {
  return (
    <select className={fieldClass} {...props}>
      {children}
    </select>
  );
}
