import { UserPlus, User, Shield, Mail, KeyRound, Eye, EyeOff, Building2 } from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

import Button from "../components/ui/Button.jsx";
import { Field, Select, TextInput } from "../components/ui/Field.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import AuthLayout from "../components/layout/AuthLayout.jsx";
import { api } from "../api/client.js";

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
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    if (form.role === "officer") {
      api.get("/departments").then(setDepartments).catch(() => {});
    }
  }, [form.role]);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  function getPasswordStrength(pass) {
    if (!pass) return { score: 0, label: "", color: "bg-border" };
    if (pass.length < 8) return { score: 1, label: "Weak (min 8 chars)", color: "bg-danger" };
    if (pass.length < 12) return { score: 2, label: "Medium", color: "bg-warning" };
    return { score: 3, label: "Strong", color: "bg-success" };
  }
  const strength = getPasswordStrength(form.password);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (form.role === "officer") {
      setError("Officer accounts are centrally provisioned by City Administration. Please sign in with your issued credentials or contact your administrator.");
      return;
    }

    if (!form.name.trim() || !form.email.trim() || !form.password) {
      setError("Please fill in all required fields.");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (form.password !== form.confirm) {
      setError("Passwords don't match.");
      return;
    }

    setSubmitting(true);
    try {
      const me = await register({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: "citizen"
      });
      navigate(`/${me.role}`, { replace: true });
    } catch (err) {
      setError(err.detail || "Registration failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout>
      <div className="w-full">
        <div className="mb-6">
          <h1 className="font-serif text-3xl font-bold tracking-tight text-ink">Create an account</h1>
          <p className="mt-2 text-ink-secondary">Join the civic platform to report or resolve issues.</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div className="space-y-3">
            <label className="text-sm font-medium text-ink">Account type</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setForm({ ...form, role: "citizen" })}
                className={`flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-all cursor-pointer ${
                  form.role === "citizen" 
                    ? "border-brand bg-brand/5 ring-1 ring-brand" 
                    : "border-border bg-card hover:border-border-strong hover:bg-hover"
                }`}
              >
                <div className={`rounded-full p-2 ${form.role === "citizen" ? "bg-slate-900 text-white dark:bg-amber-400 dark:text-slate-950 font-bold" : "bg-hover text-ink-secondary"}`}>
                  <User size={18} />
                </div>
                <div>
                  <div className="font-medium text-ink">Citizen</div>
                  <div className="text-xs text-ink-muted">I want to report civic issues</div>
                </div>
              </button>
              
              <button
                type="button"
                onClick={() => setForm({ ...form, role: "officer" })}
                className={`flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-all cursor-pointer ${
                  form.role === "officer" 
                    ? "border-brand bg-brand/5 ring-1 ring-brand" 
                    : "border-border bg-card hover:border-border-strong hover:bg-hover"
                }`}
              >
                <div className={`rounded-full p-2 ${form.role === "officer" ? "bg-slate-900 text-white dark:bg-amber-400 dark:text-slate-950 font-bold" : "bg-hover text-ink-secondary"}`}>
                  <Shield size={18} />
                </div>
                <div>
                  <div className="font-medium text-ink">Officer</div>
                  <div className="text-xs text-ink-muted">I work for a department</div>
                </div>
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-medium text-ink border-b border-border pb-2">Personal details</h3>
            <Field label="Full name">
              <TextInput value={form.name} onChange={update("name")} placeholder="John Doe" leftIcon={User} />
            </Field>
            <Field label="Email address">
              <TextInput type="email" value={form.email} onChange={update("email")} placeholder="you@example.com" leftIcon={Mail} />
            </Field>
            
            <div className="space-y-2">
              <Field label="Password">
                <TextInput 
                  type={showPassword ? "text" : "password"} 
                  value={form.password} 
                  onChange={update("password")} 
                  placeholder="••••••••" 
                  leftIcon={KeyRound}
                  rightElement={
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-ink-muted hover:text-ink transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  }
                />
              </Field>
              {form.password && (
                <div className="flex items-center gap-2">
                  <div className="flex h-1.5 flex-1 overflow-hidden rounded-full bg-border">
                    <div className={`h-full transition-all duration-300 ${strength.color}`} style={{ width: `${(strength.score / 3) * 100}%` }} />
                  </div>
                  <span className="w-12 text-right text-xs font-medium text-ink-secondary">{strength.label}</span>
                </div>
              )}
            </div>

            <Field label="Confirm password">
              <TextInput 
                type={showPassword ? "text" : "password"} 
                value={form.confirm} 
                onChange={update("confirm")} 
                placeholder="••••••••" 
                leftIcon={KeyRound} 
              />
            </Field>
          </div>

          {form.role === "officer" && (
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-4 space-y-2 text-sm animate-in fade-in slide-in-from-top-2">
              <div className="font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-2">
                <Shield size={16} /> Department Officer Security Notice
              </div>
              <p className="text-ink-secondary text-xs leading-relaxed">
                Department Officer accounts are provisioned exclusively by municipal administrators to preserve audit compliance and system security. If you are an assigned municipal officer, please sign in with your issued account credentials.
              </p>
              <div className="pt-1">
                <Link to="/login" className="text-xs font-bold text-brand hover:underline">
                  Go to Officer Sign In &rarr;
                </Link>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-md bg-danger/10 p-3 text-sm text-danger border border-danger/20">
              {error}
            </div>
          )}

          <Button type="submit" variant="primary" isLoading={submitting} className="w-full">
            Create account
          </Button>
        </form>
        
        <div className="mt-6 flex items-center justify-center space-x-2 border-t border-border pt-6 text-sm">
          <span className="text-ink-secondary">Already have an account?</span>
          <Link to="/login" className="font-medium text-brand hover:text-brand-light">
            Sign in
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}
