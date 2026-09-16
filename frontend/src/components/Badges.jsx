const STATUS_COLORS = {
  New: "bg-[var(--status-new)]",
  Assigned: "bg-[var(--status-assigned)]",
  "In Progress": "bg-[var(--status-inprogress)]",
  Resolved: "bg-[var(--status-resolved)]",
};

const PRIORITY_COLORS = {
  Critical: "bg-[var(--priority-critical)]",
  High: "bg-[var(--priority-high)]",
  Medium: "bg-[var(--priority-medium)]",
  Low: "bg-[var(--priority-low)]",
};

function Tag({ color, label }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs font-medium text-ink shadow-[var(--shadow-sm)]">
      <span className={`h-1.5 w-1.5 rounded-full ${color || "bg-ink-muted"}`} />
      {label}
    </span>
  );
}

export function StatusBadge({ status }) {
  return <Tag color={STATUS_COLORS[status]} label={status} />;
}

export function PriorityBadge({ priority }) {
  return <Tag color={PRIORITY_COLORS[priority]} label={priority} />;
}
