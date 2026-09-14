import { UserPlus } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import Button from "../components/ui/Button.jsx";
import { Field, Select, TextInput } from "../components/ui/Field.jsx";
import Panel from "../components/ui/Panel.jsx";
import { useAuth } from "../context/AuthContext.jsx";

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
      <div className="mb-6 flex items-center gap-2">
        <UserPlus size={18} className="text-signal" strokeWidth={2.25} />
        <h1 className="font-display text-2xl font-semibold text-ink">Register</h1>
      </div>
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
          <Field label="Confirm password">
            <TextInput type="password" value={form.confirm} onChange={update("confirm")} />
          </Field>
          <Field label="I am a">
            <Select value={form.role} onChange={update("role")}>
              <option value="citizen">Citizen</option>
              <option value="officer">Department Officer</option>
            </Select>
          </Field>
          {form.role === "officer" && (
            <Field
              label="Department"
              hint="Must match a department name exactly (see the public departments list) for assignment scoping to work."
            >
              <TextInput value={form.department} onChange={update("department")} placeholder="e.g. Roads & Public Works" />
            </Field>
          )}
          {error && <p className="text-sm text-brick">{error}</p>}
          <Button type="submit" variant="accent" disabled={submitting} className="w-full">
            {submitting ? "Registering…" : "Register"}
          </Button>
        </form>
      </Panel>
      <p className="mt-4 text-center text-sm text-ink-soft">
        Already have an account? <Link to="/login" className="font-medium text-steel underline underline-offset-2">Login</Link>
      </p>
    </div>
  );
}
