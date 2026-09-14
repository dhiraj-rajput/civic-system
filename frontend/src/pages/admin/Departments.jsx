import { Building2, Plus } from "lucide-react";
import { useEffect, useState } from "react";

import { api } from "../../api/client.js";
import Button from "../../components/ui/Button.jsx";
import { Field, Select, TextInput } from "../../components/ui/Field.jsx";
import PageHeader from "../../components/ui/PageHeader.jsx";
import Panel from "../../components/ui/Panel.jsx";
import { CATEGORIES } from "../../constants.js";

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
      <PageHeader
        icon={Building2}
        title="Departments"
        description="One department per category -- complaints auto-assign here when reassigned without a specific pick."
      />

      {error && <p className="mt-4 text-sm text-brick">{error}</p>}

      <div className="mt-6 space-y-2">
        {departments?.map((d) => (
          <Panel key={d.id} accent="steel" className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="font-medium text-ink">{d.name}</p>
              <p className="text-xs text-ink-soft">{d.description}</p>
            </div>
            <span className="font-ref rounded border border-line bg-paper px-2 py-1 text-xs text-ink-soft">{d.category}</span>
          </Panel>
        ))}
      </div>

      <Panel className="mt-8 p-5">
        <h2 className="flex items-center gap-2 font-display font-semibold text-ink">
          <Plus size={16} strokeWidth={2} className="text-signal" /> Add department
        </h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <Field label="Name">
            <TextInput value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </Field>
          <Field label="Category (must be unique per department)">
            <Select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </Select>
          </Field>
          <Field label="Description (optional)">
            <TextInput value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </Field>
          <Button type="submit" variant="accent" size="sm" disabled={submitting}>
            {submitting ? "Creating…" : "Create"}
          </Button>
        </form>
      </Panel>
    </div>
  );
}
