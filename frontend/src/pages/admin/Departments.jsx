import { useEffect, useState } from "react";

import { api } from "../../api/client.js";
import { CATEGORIES } from "../../constants.js";

/* Ported from ResolveAI's `page_departments`: list existing departments,
 * form to add a new one. ResolveAI's departments were plain named entities
 * with their own login (email+password); this project's departments are a
 * routing table (category -> department name, see routers/departments.py),
 * not accounts, so the create form takes a category instead of credentials. */
export default function AdminDepartments() {
  const [departments, setDepartments] = useState(null);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ name: "", category: "other", description: "" });
  const [submitting, setSubmitting] = useState(false);

  function load() {
    api.get("/departments").then(setDepartments).catch((e) => setError(e.detail || "Could not load departments"));
  }

  useEffect(load, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (!form.name.trim()) {
      setError("Department name is required.");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/departments", form);
      setForm({ name: "", category: "other", description: "" });
      load();
    } catch (err) {
      setError(err.detail || "Could not create department");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-900">🏢 Departments</h1>
      <p className="mt-1 text-sm text-slate-500">
        One department per category. Complaints auto-assign here when an admin reassigns without picking a specific department.
      </p>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-6 space-y-2">
        {departments?.map((d) => (
          <div key={d.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div>
              <p className="font-medium text-slate-900">{d.name}</p>
              <p className="text-xs text-slate-500">{d.description}</p>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{d.category}</span>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-slate-900">➕ Add Department</h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-600">Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600">Category (must be unique per department)</label>
            <select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600">Description (optional)</label>
            <input
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {submitting ? "Creating…" : "Create"}
          </button>
        </form>
      </div>
    </div>
  );
}
