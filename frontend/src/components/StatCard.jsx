/* Ported from ResolveAI's `.metric-card` CSS + st.metric usage on the
 * citizen/department/admin dashboards. */
export default function StatCard({ label, value, tone = "slate" }) {
  const toneClasses = {
    slate: "bg-slate-900 text-white",
    red: "bg-red-600 text-white",
    amber: "bg-amber-500 text-white",
    emerald: "bg-emerald-600 text-white",
    blue: "bg-blue-600 text-white",
  };
  return (
    <div className={`rounded-xl p-4 text-center shadow ${toneClasses[tone] || toneClasses.slate}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-wide opacity-80">{label}</div>
    </div>
  );
}
