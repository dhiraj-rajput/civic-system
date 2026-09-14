import { KeyRound } from "lucide-react";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import Button from "../components/ui/Button.jsx";
import { Field, TextInput } from "../components/ui/Field.jsx";
import Panel from "../components/ui/Panel.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const me = await login(email, password);
      const dest = location.state?.from?.pathname || `/${me.role}`;
      navigate(dest, { replace: true });
    } catch (err) {
      setError(err.detail || "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <div className="mb-6 flex items-center gap-2">
        <KeyRound size={18} className="text-signal" strokeWidth={2.25} />
        <h1 className="font-display text-2xl font-semibold text-ink">Login</h1>
      </div>
      <Panel className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Email">
            <TextInput type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Password">
            <TextInput type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          {error && <p className="text-sm text-brick">{error}</p>}
          <Button type="submit" variant="accent" disabled={submitting} className="w-full">
            {submitting ? "Logging in…" : "Login"}
          </Button>
        </form>
      </Panel>
      <p className="mt-4 text-center text-sm text-ink-soft">
        No account? <Link to="/register" className="font-medium text-steel underline underline-offset-2">Register</Link>
      </p>
    </div>
  );
}
