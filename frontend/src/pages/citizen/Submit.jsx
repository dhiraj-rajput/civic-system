import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { api } from "../../api/client.js";
import { CATEGORIES } from "../../constants.js";

/* Ported from ResolveAI's `page_submit` form (title/category/description/
 * location/priority fields, success banner showing the returned complaint
 * id + AI priority + duplicate warning). This backend's ComplaintCreate has
 * no free-text title or self-assessed priority (priority is computed
 * server-side by the rule engine, not user-submitted) -- the duplicate flag
 * on submission is real here (detect_duplicate), not an ML guess. */
export default function CitizenSubmit() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    category: "pothole",
    description: "",
    lat: "",
    lng: "",
    address_text: "",
  });
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setError("Geolocation isn't available in this browser -- enter coordinates manually.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({ ...f, lat: String(pos.coords.latitude), lng: String(pos.coords.longitude) }));
        setLocating(false);
      },
      () => {
        setError("Could not get your location -- enter coordinates manually.");
        setLocating(false);
      }
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setResult(null);

    if (!form.description.trim()) {
      setError("Description is required.");
      return;
    }
    const lat = parseFloat(form.lat);
    const lng = parseFloat(form.lng);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      setError("Valid latitude and longitude are required.");
      return;
    }

    setSubmitting(true);
    try {
      const complaint = await api.post("/complaints", {
        category: form.category,
        description: form.description,
        location: { lat, lng },
        address_text: form.address_text || null,
      });
      setResult(complaint);
    } catch (err) {
      setError(err.detail || "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-900">📝 Submit a Complaint</h1>

      {result ? (
        <div className="mt-6 rounded-lg bg-emerald-50 p-6 text-emerald-800">
          <p className="font-semibold">✅ Complaint submitted! ID: {result.complaint_id}</p>
          <p className="mt-1 text-sm">Priority assessed: <strong>{result.priority_label}</strong> ({result.priority_score.toFixed(1)})</p>
          {result.is_duplicate && (
            <p className="mt-2 rounded bg-amber-100 px-3 py-2 text-sm text-amber-800">
              ⚠️ This looks similar to a recent nearby complaint of the same type -- flagged for review.
            </p>
          )}
          <div className="mt-4 flex gap-3">
            <button onClick={() => navigate("/citizen/complaints")} className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
              View my complaints
            </button>
            <button
              onClick={() => {
                setResult(null);
                setForm({ category: "pothole", description: "", lat: "", lng: "", address_text: "" });
              }}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Submit another
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Category</label>
            <select value={form.category} onChange={update("category")} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2">
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Description *</label>
            <textarea
              required
              rows={4}
              value={form.description}
              onChange={update("description")}
              placeholder="Describe the issue in detail -- location landmarks, how long it's been there, etc."
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-slate-700">Location *</label>
              <button type="button" onClick={useMyLocation} disabled={locating} className="text-xs font-medium text-blue-600 hover:underline">
                {locating ? "Locating…" : "📍 Use my current location"}
              </button>
            </div>
            <div className="mt-1 grid grid-cols-2 gap-3">
              <input
                required
                placeholder="Latitude"
                value={form.lat}
                onChange={update("lat")}
                className="rounded-md border border-slate-300 px-3 py-2"
              />
              <input
                required
                placeholder="Longitude"
                value={form.lng}
                onChange={update("lng")}
                className="rounded-md border border-slate-300 px-3 py-2"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Address / landmark (optional)</label>
            <input
              value={form.address_text}
              onChange={update("address_text")}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </div>
          {error && <p className="text-sm text-red-600">❌ {error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-slate-900 py-2.5 font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {submitting ? "Submitting…" : "🚀 Submit Complaint"}
          </button>
        </form>
      )}
    </div>
  );
}
