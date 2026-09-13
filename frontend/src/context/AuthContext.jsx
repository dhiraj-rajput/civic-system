import { createContext, useContext, useEffect, useState, useCallback } from "react";

import { api, setAuthToken, ApiError } from "../api/client.js";

/* Ported from ResolveAI's Streamlit session-state auth (token/role/user in
 * st.session_state, redirect-if-not-authenticated guard) -- reimplemented as
 * a React context backed by localStorage so a refresh doesn't log you out. */

const AuthContext = createContext(null);

const STORAGE_KEY = "civic_token";

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(STORAGE_KEY));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadMe = useCallback(async (currentToken) => {
    if (!currentToken) {
      setUser(null);
      setLoading(false);
      return;
    }
    setAuthToken(currentToken);
    try {
      const me = await api.get("/auth/me");
      setUser(me);
    } catch {
      // token expired/invalid
      localStorage.removeItem(STORAGE_KEY);
      setAuthToken(null);
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMe(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function login(email, password) {
    const { access_token } = await api.post("/auth/login", { email, password });
    localStorage.setItem(STORAGE_KEY, access_token);
    setAuthToken(access_token);
    setToken(access_token);
    const me = await api.get("/auth/me");
    setUser(me);
    return me;
  }

  async function register({ name, email, password, role, department }) {
    const { access_token } = await api.post("/auth/register", {
      name,
      email,
      password,
      role,
      department: role === "officer" ? department : undefined,
    });
    localStorage.setItem(STORAGE_KEY, access_token);
    setAuthToken(access_token);
    setToken(access_token);
    const me = await api.get("/auth/me");
    setUser(me);
    return me;
  }

  async function bootstrapAdmin({ name, email, password }) {
    const { access_token } = await api.post("/auth/bootstrap-admin", { name, email, password });
    localStorage.setItem(STORAGE_KEY, access_token);
    setAuthToken(access_token);
    setToken(access_token);
    const me = await api.get("/auth/me");
    setUser(me);
    return me;
  }

  function logout() {
    localStorage.removeItem(STORAGE_KEY);
    setAuthToken(null);
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ token, user, loading, login, register, bootstrapAdmin, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export { ApiError };
