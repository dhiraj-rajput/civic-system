import { ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import Button from "../components/ui/Button.jsx";
import { Field, TextInput } from "../components/ui/Field.jsx";
import Panel from "../components/ui/Panel.jsx";
import { useAuth } from "../context/AuthContext.jsx";

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
      <div className="mb-2 flex items-center gap-2">
        <ShieldCheck size={18} className="text-signal" strokeWidth={2.25} />
        <h1 className="font-display text-2xl font-semibold text-ink">Create admin account</h1>
      </div>
      <p className="mb-6 text-sm text-ink-soft">
        This only works once. If an admin account already exists, it will fail — log in normally instead.
      </p>
      <Panel className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Full name">
            <TextInput value={form.name} onChange={update("name")} />
          </Field>
          <Field label="Email">
            <TextInput type="email" value={form.email} onChange={update("email")} />
          </Field>
          <Field label="Password">
            <TextInput type="password" value={form.password} onChange={update("password")} />
          </Field>
          {error && <p className="text-sm text-brick">{error}</p>}
          <Button type="submit" variant="accent" disabled={submitting} className="w-full">
            {submitting ? "Creating…" : "Create admin"}
          </Button>
        </form>
      </Panel>
    </div>
  );
}
