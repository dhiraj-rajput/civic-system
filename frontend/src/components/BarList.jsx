/* Lightweight bar chart with plain divs -- ResolveAI used st.bar_chart
 * (pandas + Streamlit's built-in charting); no equivalent zero-dependency
 * primitive exists in this React setup, so this reimplements the same idea
 * (label + proportional bar) without pulling in a charting library. */
export default function BarList({ data, labelKey = "_id", valueKey = "count" }) {
  if (!data?.length) return <p className="text-sm text-slate-400">No data yet.</p>;
  const max = Math.max(...data.map((d) => d[valueKey]));
  return (
    <div className="space-y-2">
      {data.map((d) => (
        <div key={d[labelKey]} className="flex items-center gap-3">
          <span className="w-28 shrink-0 text-xs text-slate-600">{d[labelKey]}</span>
          <div className="h-4 flex-1 rounded bg-slate-100">
            <div
              className="h-4 rounded bg-slate-900"
              style={{ width: max ? `${(d[valueKey] / max) * 100}%` : "0%" }}
            />
          </div>
          <span className="w-8 text-right text-xs font-medium text-slate-700">{d[valueKey]}</span>
        </div>
      ))}
    </div>
  );
}
