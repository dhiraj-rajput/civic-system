const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

let authToken = null;

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
    const detail = body && typeof body === "object" ? body.detail : body;
    throw new ApiError(res.status, detail || `Request failed (${res.status})`);
  }
  return body;
}

export const api = {
  get: (path) => apiFetch(path),
  post: (path, json) => apiFetch(path, { method: "POST", body: json !== undefined ? JSON.stringify(json) : undefined }),
  patch: (path, json) => apiFetch(path, { method: "PATCH", body: json !== undefined ? JSON.stringify(json) : "{}" }),
  del: (path) => apiFetch(path, { method: "DELETE" }),
  upload: (path, formData) => apiFetch(path, { method: "POST", body: formData }),
};
