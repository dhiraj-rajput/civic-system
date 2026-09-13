/* Ported from ResolveAI's `status_badge` / `priority_badge` Streamlit
 * helpers -- same colour-coding idea, adapted to this project's actual
 * Status ("New"/"Assigned"/"In Progress"/"Resolved") and priority_label
 * ("Critical"/"High"/"Medium"/"Low") values instead of ResolveAI's own. */

const STATUS_STYLES = {
  New: "bg-red-100 text-red-700",
  Assigned: "bg-amber-100 text-amber-700",
  "In Progress": "bg-blue-100 text-blue-700",
  Resolved: "bg-emerald-100 text-emerald-700",
};

const PRIORITY_STYLES = {
  Critical: "bg-red-600 text-white",
  High: "bg-orange-500 text-white",
  Medium: "bg-amber-400 text-slate-900",
  Low: "bg-slate-200 text-slate-700",
};

export function StatusBadge({ status }) {
  const cls = STATUS_STYLES[status] || "bg-slate-100 text-slate-700";
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
      {status}
    </span>
  );
}

export function PriorityBadge({ priority }) {
  const cls = PRIORITY_STYLES[priority] || "bg-slate-100 text-slate-700";
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
      {priority}
    </span>
  );
}
