import { Link } from "react-router-dom";

/* Ported from ResolveAI's `page_home` hero + 4 feature cards. Rewritten to
 * describe what this project actually does -- rule-based prioritization and
 * duplicate detection, not ML/AI claims ResolveAI's own README made but
 * never implemented. */

const FEATURES = [
  { icon: "📐", title: "Rule-Based Prioritization", desc: "Age + category + nearby-complaint clustering" },
  { icon: "🔍", title: "Duplicate Detection", desc: "Flags likely-duplicate reports automatically" },
  { icon: "📊", title: "Live Dashboards", desc: "Status, hotspots, and SLA tracking for admins" },
  { icon: "🔐", title: "Role-Based Access", desc: "Citizen · Officer · Admin" },
];

export default function Home() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 px-8 py-16 text-center text-white shadow-lg">
        <h1 className="text-4xl font-bold sm:text-5xl">Smart Civic Complaint Portal</h1>
        <p className="mt-4 text-lg text-slate-200">
          From citizen report to municipal resolution — one queue, tracked end to end.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Link to="/register" className="rounded-lg bg-white px-6 py-3 font-semibold text-slate-900 hover:bg-slate-100">
            Report an Issue
          </Link>
          <Link to="/login" className="rounded-lg border border-white/40 px-6 py-3 font-semibold hover:bg-white/10">
            Login
          </Link>
        </div>
      </div>

      <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {FEATURES.map((f) => (
          <div key={f.title} className="rounded-xl bg-white p-4 text-center shadow">
            <div className="text-2xl">{f.icon}</div>
            <div className="mt-2 font-semibold text-slate-900">{f.title}</div>
            <div className="mt-1 text-xs text-slate-500">{f.desc}</div>
          </div>
        ))}
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl bg-white p-6 shadow">
          <h3 className="font-semibold text-slate-900">👤 Citizens</h3>
          <p className="mt-1 text-sm text-slate-500">Submit and track issues, see status updates in real time.</p>
        </div>
        <div className="rounded-xl bg-white p-6 shadow">
          <h3 className="font-semibold text-slate-900">🏢 Department Officers</h3>
          <p className="mt-1 text-sm text-slate-500">Work your department's queue, update status as you go.</p>
        </div>
        <div className="rounded-xl bg-white p-6 shadow">
          <h3 className="font-semibold text-slate-900">🛡️ Admins</h3>
          <p className="mt-1 text-sm text-slate-500">Full oversight: assign, reassign, analytics, SLA tracking.</p>
        </div>
      </div>

      <p className="mt-10 text-center text-xs text-slate-400">
        First time running this? <Link to="/bootstrap-admin" className="underline">Create the admin account</Link>.
      </p>
    </div>
  );
}
