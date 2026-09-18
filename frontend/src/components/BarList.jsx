/* Plain bar list -- flat steel bars on a hairline track, labels in the UI
 * font, counts in the reference (monospace) font since they're figures.
 * No gradient fill, no rounded pill bars -- keeps the "case-file report"
 * register instead of a consumer-dashboard one. */
export default function BarList({ data, labelKey = "_id", valueKey = "count" }) {
  if (!data?.length) return <p className="text-sm text-ink-secondary">No data yet.</p>;
  const max = Math.max(...data.map((d) => d[valueKey]));
  return (
    <div className="space-y-2.5">
      {data.map((d) => (
        <div key={d[labelKey]} className="flex items-center gap-3">
          <span className="w-28 shrink-0 text-xs text-ink-secondary truncate" title={d[labelKey]}>{d[labelKey]}</span>
          <div className="h-2 flex-1 rounded-full bg-slate-200 dark:bg-zinc-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-slate-800 dark:bg-amber-400 transition-all duration-500"
              style={{ width: max ? `${(d[valueKey] / max) * 100}%` : "0%" }}
            />
          </div>
          <span className="font-mono w-8 text-right text-xs font-semibold text-ink">{d[valueKey]}</span>
        </div>
      ))}
    </div>
  );
}
