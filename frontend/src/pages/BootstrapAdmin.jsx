import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext.jsx";

/* New page, not in ResolveAI: exposes POST /auth/bootstrap-admin, which
 * only ever succeeds once (see backend/app/routers/auth.py). ResolveAI had
 * no equivalent gate -- its POST /admin/create had no visible protection
 * against creating multiple admins from what's in the reference project. */
export default function BootstrapAdmin() {
  const { bootstrapAdmin } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await bootstrapAdmin(form);
      navigate("/admin", { replace: true });
    } catch (err) {
      setError(err.detail || "Could not create admin account");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-2xl font-bold text-slate-900">🛡️ Create Admin Account</h1>
      <p className="mt-2 text-sm text-slate-500">
        This only works once. If an admin account already exists, this will fail — log in normally instead.
      </p>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">Full name</label>
          <input value={form.name} onChange={update("name")} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Email</label>
          <input type="email" value={form.email} onChange={update("email")} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Password</label>
          <input type="password" value={form.password} onChange={update("password")} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" />
        </div>
        {error && <p className="text-sm text-red-600">❌ {error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-slate-900 py-2 font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {submitting ? "Creating…" : "Create Admin"}
        </button>
      </form>
    </div>
  );
}
