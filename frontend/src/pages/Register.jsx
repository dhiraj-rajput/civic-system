import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext.jsx";

/* Ported from ResolveAI's `page_register` -- field-by-field validation with
 * a single error message, password-confirmation check. ResolveAI's version
 * collected age/guardian-consent/full address for citizens; trimmed here to
 * what this project's schema actually uses. Adds the officer role +
 * department field, which ResolveAI handled via a *separate* department
 * officer creation endpoint -- unified into one form here since this
 * backend's /auth/register accepts both. */
export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirm: "",
    role: "citizen",
    department: "",
  });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (!form.name.trim() || !form.email.trim() || !form.password) {
      setError("Please fill in all required fields.");
      return;
    }
    if (form.password !== form.confirm) {
      setError("Passwords don't match.");
      return;
    }
    if (form.role === "officer" && !form.department.trim()) {
      setError("Department is required for officer accounts.");
      return;
    }

    setSubmitting(true);
    try {
      const me = await register(form);
      navigate(`/${me.role}`, { replace: true });
    } catch (err) {
      setError(err.detail || "Registration failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-2xl font-bold text-slate-900">📝 Register</h1>
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
        <div>
          <label className="block text-sm font-medium text-slate-700">Confirm password</label>
          <input type="password" value={form.confirm} onChange={update("confirm")} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">I am a</label>
          <select value={form.role} onChange={update("role")} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2">
            <option value="citizen">Citizen</option>
            <option value="officer">Department Officer</option>
          </select>
        </div>
        {form.role === "officer" && (
          <div>
            <label className="block text-sm font-medium text-slate-700">Department</label>
            <input
              value={form.department}
              onChange={update("department")}
              placeholder="e.g. Roads & Public Works"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            />
            <p className="mt-1 text-xs text-slate-400">
              Must match a department name exactly (see the public departments list) for assignment scoping to work.
            </p>
          </div>
        )}
        {error && <p className="text-sm text-red-600">❌ {error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-slate-900 py-2 font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {submitting ? "Registering…" : "Register"}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-slate-500">
        Already have an account? <Link to="/login" className="font-medium text-slate-900 underline">Login</Link>
      </p>
    </div>
  );
}
