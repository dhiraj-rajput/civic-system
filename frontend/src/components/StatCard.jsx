/* Case-file metric block: a large monospace number (it's a count, treated
 * like a reference figure) over a plain label, left-accented by tone. This
 * replaces the filled-color "metric card" default (ported from ResolveAI's
 * .metric-card) with something that matches the rest of the system. */
const TONE_ACCENT = {
  steel: "border-l-steel",
  signal: "border-l-signal",
  brick: "border-l-brick",
  civic: "border-l-civic",
};

export default function StatCard({ label, value, tone = "steel" }) {
  return (
    <div className={`rounded border border-line border-l-4 bg-surface px-4 py-3 ${TONE_ACCENT[tone]}`}>
      <div className="font-ref text-2xl font-medium text-ink">{value}</div>
      <div className="mt-0.5 text-xs text-ink-soft">{label}</div>
    </div>
  );
}
