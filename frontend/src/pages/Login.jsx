import { KeyRound, Mail, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import Button from "../components/ui/Button.jsx";
import { Field, TextInput } from "../components/ui/Field.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import AuthLayout from "../components/layout/AuthLayout.jsx";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
      setError(err.detail || "Login failed. Please check your credentials.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout>
      <div className="w-full">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold tracking-tight text-ink">Welcome back</h1>
          <p className="mt-2 text-ink-secondary">Sign in to your civic portal account</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <Field label="Email address">
            <TextInput 
              type="email" 
              required 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              leftIcon={Mail}
              placeholder="you@example.com"
            />
          </Field>
          
          <Field label="Password">
            <TextInput 
              type={showPassword ? "text" : "password"} 
              required 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              leftIcon={KeyRound}
              placeholder="••••••••"
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
          
          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 text-ink-secondary cursor-pointer">
              <input type="checkbox" className="rounded border-border text-brand focus:ring-focus bg-input" />
              Remember me
            </label>
            <a href="#" className="font-medium text-brand hover:text-brand-light">Forgot password?</a>
          </div>

          {error && (
            <div className="rounded-md bg-danger/10 p-3 text-sm text-danger border border-danger/20">
              {error}
            </div>
          )}

          <Button type="submit" variant="primary" isLoading={submitting} className="mt-2 w-full">
            Sign in
          </Button>
        </form>
        
        <div className="mt-8 flex items-center justify-center space-x-2 border-t border-border pt-6 text-sm">
          <span className="text-ink-secondary">Don't have an account?</span>
          <Link to="/register" className="font-medium text-brand hover:text-brand-light">
            Create one
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}
