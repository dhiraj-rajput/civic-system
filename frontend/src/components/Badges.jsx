/* Status/priority shown as stamped case-tags -- a small filled square +
 * label, echoing a case-file stamp rather than the generic pill badge.
 * Ported concept from ResolveAI's status_badge/priority_badge, restyled to
 * this project's design language. */
const STATUS_TONE = {
  New: "bg-brick",
  Assigned: "bg-signal",
  "In Progress": "bg-steel",
  Resolved: "bg-civic",
};

const PRIORITY_TONE = {
  Critical: "bg-brick",
  High: "bg-signal",
  Medium: "bg-steel",
  Low: "bg-ink-soft",
};

function Tag({ tone, label }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink">
      <span className={`h-2 w-2 rounded-sm ${tone || "bg-ink-soft"}`} />
      {label}
    </span>
  );
}

export function StatusBadge({ status }) {
  return <Tag tone={STATUS_TONE[status]} label={status} />;
}

export function PriorityBadge({ priority }) {
  return <Tag tone={PRIORITY_TONE[priority]} label={priority} />;
}
