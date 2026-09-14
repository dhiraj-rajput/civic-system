/* Consistent page header: icon + title + optional description. Deliberately
 * plain -- no eyebrow label above it, no decorative rule -- the design
 * skill's "avoid template chrome" guidance. */
export default function PageHeader({ icon: Icon, title, description, action }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line pb-4">
      <div className="flex items-start gap-3">
        {Icon && (
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded bg-steel text-white">
            <Icon size={18} strokeWidth={2} />
          </div>
        )}
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">{title}</h1>
          {description && <p className="mt-1 text-sm text-ink-soft">{description}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}
