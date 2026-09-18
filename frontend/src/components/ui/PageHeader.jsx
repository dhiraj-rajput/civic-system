/* Consistent page header: icon + title + optional description. Deliberately
 * plain -- no eyebrow label above it, no decorative rule -- the design
 * skill's "avoid template chrome" guidance. */
export default function PageHeader({ icon: Icon, title, description, action }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
      <div className="flex items-start gap-3">
        {Icon && (
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded bg-slate-900 text-white dark:bg-amber-400 dark:text-slate-950 shadow-sm">
            <Icon size={18} strokeWidth={2} />
          </div>
        )}
        <div>
          <h1 className="font-serif text-2xl font-bold tracking-tight text-ink">{title}</h1>
          {description && <p className="mt-1 text-sm text-ink-secondary">{description}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}
