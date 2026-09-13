/* Ported from ResolveAI's "🔍 Track complaint" button on My Complaints,
 * which just dumped raw JSON via st.json(). Rendered here as an actual
 * timeline against this project's `history` array (event/detail/at). */
const EVENT_ICON = {
  created: "📝",
  status_changed: "🔄",
  assigned: "🏢",
  comment_added: "💬",
};

export default function HistoryTimeline({ history }) {
  if (!history?.length) {
    return <p className="text-sm text-slate-400">No history yet.</p>;
  }
  return (
    <ol className="space-y-3 border-l-2 border-slate-200 pl-4">
      {history.map((h, i) => (
        <li key={i} className="relative">
          <span className="absolute -left-[1.4rem] top-0.5">{EVENT_ICON[h.event] || "•"}</span>
          <p className="text-sm text-slate-800">{h.detail}</p>
          <p className="text-xs text-slate-400">{new Date(h.at).toLocaleString()}</p>
        </li>
      ))}
    </ol>
  );
}
