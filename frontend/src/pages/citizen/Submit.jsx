import { FileText, LocateFixed } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { api } from "../../api/client.js";
import Button from "../../components/ui/Button.jsx";
import { Field, Select, TextArea, TextInput } from "../../components/ui/Field.jsx";
import PageHeader from "../../components/ui/PageHeader.jsx";
import Panel from "../../components/ui/Panel.jsx";
import { PriorityBadge } from "../../components/Badges.jsx";
import { CATEGORIES } from "../../constants.js";

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
      <PageHeader icon={FileText} title="Submit a complaint" description="Category, description, and location -- that's all it takes to open a case." />

      {result ? (
        <Panel accent="civic" className="mt-6 p-6">
          <p className="font-ref text-sm text-ink-soft">{result.complaint_id}</p>
          <p className="mt-1 font-medium text-ink">Complaint filed successfully.</p>
          <div className="mt-3 flex items-center gap-2 text-sm text-ink-soft">
            Priority assessed: <PriorityBadge priority={result.priority_label} />
            <span className="font-ref">({result.priority_score.toFixed(1)})</span>
          </div>
          {result.is_duplicate && (
            <p className="mt-3 rounded border border-signal/40 bg-signal/10 px-3 py-2 text-sm text-signal-dark">
              This looks similar to a recent nearby complaint of the same type -- flagged for review.
            </p>
          )}
          <div className="mt-5 flex gap-3">
            <Button variant="primary" onClick={() => navigate("/citizen/complaints")}>
              View my complaints
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setResult(null);
                setForm({ category: "pothole", description: "", lat: "", lng: "", address_text: "" });
              }}
            >
              Submit another
            </Button>
          </div>
        </Panel>
      ) : (
        <Panel className="mt-6 p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Category">
              <Select value={form.category} onChange={update("category")}>
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </Select>
            </Field>
            <Field label="Description">
              <TextArea
                required
                rows={4}
                value={form.description}
                onChange={update("description")}
                placeholder="Describe the issue -- location landmarks, how long it's been there, etc."
              />
            </Field>
            <div>
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-ink">Location</label>
                <button
                  type="button"
                  onClick={useMyLocation}
                  disabled={locating}
                  className="flex items-center gap-1 text-xs font-medium text-steel hover:underline"
                >
                  <LocateFixed size={13} strokeWidth={2} />
                  {locating ? "Locating…" : "Use my current location"}
                </button>
              </div>
              <div className="mt-1 grid grid-cols-2 gap-3">
                <TextInput required placeholder="Latitude" value={form.lat} onChange={update("lat")} />
                <TextInput required placeholder="Longitude" value={form.lng} onChange={update("lng")} />
              </div>
            </div>
            <Field label="Address / landmark (optional)">
              <TextInput value={form.address_text} onChange={update("address_text")} />
            </Field>
            {error && <p className="text-sm text-brick">{error}</p>}
            <Button type="submit" variant="accent" disabled={submitting} className="w-full">
              {submitting ? "Submitting…" : "Submit complaint"}
            </Button>
          </form>
        </Panel>
      )}
    </div>
  );
}
