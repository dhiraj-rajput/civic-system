import { FilePlus, RefreshCw, Building2, MessageSquare } from "lucide-react";

/* Case-file timeline: a plain vertical rule with small icon markers rather
 * than a decorative dot-and-gradient timeline. Ported from ResolveAI's
 * "Track complaint" button, which just dumped raw JSON via st.json(). */
const EVENT_ICON = {
  created: FilePlus,
  status_changed: RefreshCw,
  assigned: Building2,
  comment_added: MessageSquare,
};

export default function HistoryTimeline({ history }) {
  if (!history?.length) {
    return <p className="text-sm text-ink-soft">No history yet.</p>;
  }
  return (
    <ol className="space-y-4 border-l border-line pl-4">
      {history.map((h, i) => {
        const Icon = EVENT_ICON[h.event] || FilePlus;
        return (
          <li key={i} className="relative">
            <span className="absolute -left-[1.4rem] top-0 flex h-5 w-5 items-center justify-center rounded-full bg-paper text-steel ring-1 ring-line">
              <Icon size={11} strokeWidth={2.25} />
            </span>
            <p className="text-sm text-ink">{h.detail}</p>
            <p className="font-ref text-xs text-ink-soft">{new Date(h.at).toLocaleString()}</p>
          </li>
        );
      })}
    </ol>
  );
}
