const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

let authToken = typeof window !== "undefined" ? localStorage.getItem("civic_token") : null;

export function setAuthToken(token) {
  authToken = token;
}

export class ApiError extends Error {
  constructor(status, detail) {
    super(typeof detail === "string" ? detail : "Request failed");
    this.status = status;
    this.detail = detail;
  }
}

export async function apiFetch(path, options = {}) {
  const isFormData = options.body instanceof FormData;
  const headers = isFormData 
    ? { ...(options.headers || {}) } 
    : { "Content-Type": "application/json", ...(options.headers || {}) };
    
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (res.status === 401) {
    authToken = null;
    if (typeof window !== "undefined") {
      localStorage.removeItem("civic_token");
      const p = window.location.pathname;
      if (p !== "/login" && p !== "/register" && p !== "/bootstrap-admin" && p !== "/") {
        window.location.href = "/login";
      }
    }
  }

  if (res.status === 204) return null;

  let body = null;
  const text = await res.text();
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!res.ok) {
    let detail = body && typeof body === "object" ? body.detail : body;
    if (res.status === 413 || (typeof detail === "string" && (detail.includes("413") || detail.toLowerCase().includes("request entity too large")))) {
      detail = "File size exceeds the server upload limit (max 50MB for videos, 15MB for photos). Please select a smaller file.";
    } else if (typeof detail === "string" && (detail.trim().startsWith("<") || detail.includes("<html") || detail.includes("<!DOCTYPE"))) {
      if (res.status === 502 || res.status === 504) {
        detail = "Backend service temporarily unavailable. Please try again in a few moments.";
      } else {
        detail = `Server error (${res.status}). Please try again with smaller files.`;
      }
    }
    throw new ApiError(res.status, detail || `Request failed (${res.status})`);
  }
  return body;
}

export const api = {
  get: (path) => apiFetch(path),
  post: (path, json) => apiFetch(path, { method: "POST", body: json !== undefined ? JSON.stringify(json) : undefined }),
  patch: (path, json) => apiFetch(path, { method: "PATCH", body: json !== undefined ? JSON.stringify(json) : "{}" }),
  del: (path) => apiFetch(path, { method: "DELETE" }),
  delete: (path) => apiFetch(path, { method: "DELETE" }),
  upload: (path, formData) => apiFetch(path, { method: "POST", body: formData }),
};
