import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { 
  Search, ShieldCheck, CheckCircle2, Clock, AlertTriangle, 
  MapPin, Building, ArrowLeft, ExternalLink, Calendar, 
  ChevronRight, Star, RefreshCw, Sparkles, Image, Check, FileText
} from "lucide-react";
import { api } from "@/api/client";
import { PriorityBadge, StatusBadge } from "@/components/Badges";
import CivicLogo from "@/components/CivicLogo";
import ThemeToggle from "@/components/ui/ThemeToggle";

export default function PublicTrack() {
  const { id: routeId } = useParams();
  const navigate = useNavigate();
  const [searchId, setSearchId] = useState(routeId || "");
  const [loading, setLoading] = useState(false);
  const [complaint, setComplaint] = useState(null);
  const [error, setError] = useState("");

  const STEPS = ["New", "Assigned", "In Progress", "Resolved", "Closed"];

  const getStepIndex = (status) => {
    switch (status) {
      case "New": return 0;
      case "Assigned": return 1;
      case "In Progress": return 2;
      case "Resolved": return 3;
      case "Closed": return 4;
      case "Reopened": return 1;
      default: return 0;
    }
  };

  const fetchComplaint = async (targetId) => {
    if (!targetId || !targetId.trim()) return;
    setLoading(true);
    setError("");
    setComplaint(null);
    try {
      const data = await api.get(`/complaints/public-track/${encodeURIComponent(targetId.trim())}`);
      setComplaint(data);
    } catch (err) {
      setError(err?.response?.data?.detail || "No civic complaint found with that reference ID. Please check and try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (routeId) {
      setSearchId(routeId);
      fetchComplaint(routeId);
    }
  }, [routeId]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchId.trim()) return;
    navigate(`/track/${encodeURIComponent(searchId.trim())}`);
    fetchComplaint(searchId.trim());
  };

  const currentStep = complaint ? getStepIndex(complaint.status) : -1;

  return (
    <div className="min-h-screen bg-bg text-ink flex flex-col">
      {/* Top Navbar */}
      <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-30 px-4 py-3 sm:px-8 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
          <CivicLogo className="w-7 h-7" />
          <span className="font-serif font-bold text-base tracking-tight text-ink">
            CivicPortal <span className="text-brand text-xs font-mono uppercase px-1.5 py-0.5 rounded bg-brand/10 border border-brand/20">Track</span>
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link 
            to="/login"
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-border bg-surface hover:bg-surface-hover text-ink transition-colors"
          >
            Sign In
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 sm:py-12 space-y-8">
        {/* Search Hero */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand/10 text-brand text-xs font-medium border border-brand/20">
            <ShieldCheck size={14} /> Open Municipal Transparency
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-ink">
            Track Any Civic Request
          </h1>
          <p className="text-sm text-ink-muted max-w-lg mx-auto">
            Inspect real-time field progress, SLA response metrics, and resolution evidence for any New York 311 or municipal work order.
          </p>

          {/* Search Box */}
          <form onSubmit={handleSearch} className="max-w-xl mx-auto pt-2">
            <div className="relative flex items-center shadow-sm">
              <Search size={18} className="absolute left-3.5 text-ink-muted" />
              <input
                type="text"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                placeholder="Enter Complaint ID (e.g. CMP-2026-0001 or NYC 311 Key)..."
                className="w-full rounded-l-xl border border-r-0 border-border bg-card pl-10 pr-4 py-3 text-sm text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              />
              <button
                type="submit"
                disabled={loading || !searchId.trim()}
                className="bg-brand text-white font-medium text-sm px-5 py-3 rounded-r-xl hover:bg-brand-hover disabled:opacity-50 transition-colors flex items-center gap-1.5 shrink-0"
              >
                {loading ? <RefreshCw size={16} className="animate-spin" /> : "Track"}
              </button>
            </div>
          </form>

          {/* Sample quick buttons for testing */}
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-ink-muted pt-1">
            <span>Quick test:</span>
            <button 
              type="button"
              onClick={() => { setSearchId("CMP-2026-0001"); fetchComplaint("CMP-2026-0001"); }}
              className="px-2 py-0.5 rounded bg-surface hover:bg-surface-hover border border-border font-mono text-[11px] transition-colors"
            >
              CMP-2026-0001
            </button>
            <button 
              type="button"
              onClick={() => { setSearchId("311-2026-0001"); fetchComplaint("311-2026-0001"); }}
              className="px-2 py-0.5 rounded bg-surface hover:bg-surface-hover border border-border font-mono text-[11px] transition-colors"
            >
              311-2026-0001
            </button>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-center text-sm text-red-600 dark:text-red-400 space-y-1 animate-in fade-in">
            <p className="font-semibold">{error}</p>
            <p className="text-xs text-ink-muted">Make sure the ID is correct or check the citizen portal after signing in.</p>
          </div>
        )}

        {/* Complaint Details Card */}
        {complaint && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Header / Summary Card */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-mono text-lg font-bold text-ink">{complaint.complaint_id}</h2>
                    <StatusBadge status={complaint.status} />
                    <PriorityBadge priority={complaint.priority_label} />
                  </div>
                  <p className="text-xs text-ink-muted flex items-center gap-1">
                    <Calendar size={13} /> Filed {new Date(complaint.created_at).toLocaleString()}
                  </p>
                </div>
                {complaint.agency && (
                  <div className="text-left sm:text-right">
                    <span className="text-[10px] uppercase font-bold text-ink-muted tracking-wider">Responsible Agency</span>
                    <p className="text-xs font-semibold text-ink">{complaint.agency}</p>
                  </div>
                )}
              </div>

              {/* Visual Progress Stepper */}
              <div className="py-2">
                <div className="relative flex items-center justify-between">
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-border w-full -z-0" />
                  <div 
                    className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-brand transition-all duration-500 -z-0" 
                    style={{ width: `${(Math.max(0, currentStep) / (STEPS.length - 1)) * 100}%` }}
                  />

                  {STEPS.map((step, idx) => {
                    const isDone = idx <= currentStep;
                    const isCurrent = idx === currentStep;
                    return (
                      <div key={step} className="flex flex-col items-center gap-1.5 z-10">
                        <div 
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-colors shadow-sm ${
                            isDone 
                              ? "bg-brand text-white ring-4 ring-brand/20" 
                              : "bg-surface border border-border text-ink-muted"
                          }`}
                        >
                          {isDone ? <Check size={14} /> : idx + 1}
                        </div>
                        <span className={`text-[11px] font-medium hidden sm:inline ${
                          isCurrent ? "text-brand font-bold" : isDone ? "text-ink" : "text-ink-muted"
                        }`}>
                          {step}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex sm:hidden justify-between mt-2 px-1 text-[10px] text-ink-muted">
                  <span>Filed</span>
                  <span>In Progress</span>
                  <span>Verified</span>
                </div>
              </div>

              {/* Core Information Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2 text-xs">
                <div className="p-3.5 rounded-xl bg-surface border border-border space-y-1">
                  <span className="text-[10px] uppercase font-semibold text-ink-muted tracking-wider flex items-center gap-1">
                    <FileText size={12} /> Category
                  </span>
                  <p className="font-semibold text-ink capitalize">{complaint.category?.replace(/_/g, " ")}</p>
                </div>

                <div className="p-3.5 rounded-xl bg-surface border border-border space-y-1">
                  <span className="text-[10px] uppercase font-semibold text-ink-muted tracking-wider flex items-center gap-1">
                    <MapPin size={12} /> Location & Borough
                  </span>
                  <p className="font-semibold text-ink truncate" title={complaint.address_text}>
                    {complaint.borough ? `${complaint.borough} • ` : ""}{complaint.address_text || "New York, NY"}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-surface border border-border space-y-1">
                  <span className="text-[10px] uppercase font-semibold text-ink-muted tracking-wider flex items-center gap-1">
                    <Building size={12} /> Department
                  </span>
                  <p className="font-semibold text-ink">{complaint.assigned_to || "Pending Dispatch"}</p>
                </div>
              </div>
            </div>

            {/* Resolution Evidence (Before / After Photos) */}
            {complaint.resolution_evidence && (
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-border pb-3">
                  <CheckCircle2 size={18} className="text-emerald-500" />
                  <h3 className="font-semibold text-sm text-ink">Field Resolution Evidence</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {complaint.resolution_evidence.before_image_url && (
                    <div className="space-y-1.5">
                      <span className="text-xs font-semibold text-ink-muted uppercase tracking-wider">Before Repair</span>
                      <img 
                        src={complaint.resolution_evidence.before_image_url} 
                        alt="Before fix"
                        className="rounded-xl border border-border w-full h-48 object-cover shadow-inner" 
                      />
                    </div>
                  )}
                  {complaint.resolution_evidence.after_image_url && (
                    <div className="space-y-1.5">
                      <span className="text-xs font-semibold text-ink-muted uppercase tracking-wider">After Repair</span>
                      <img 
                        src={complaint.resolution_evidence.after_image_url} 
                        alt="After fix"
                        className="rounded-xl border border-border w-full h-48 object-cover shadow-inner" 
                      />
                    </div>
                  )}
                </div>

                {complaint.resolution_evidence.notes && (
                  <p className="text-xs text-ink-secondary bg-surface p-3 rounded-lg border border-border">
                    <span className="font-semibold text-ink">Officer Note: </span>
                    {complaint.resolution_evidence.notes}
                  </p>
                )}
              </div>
            )}

            {/* Citizen Verification Rating */}
            {complaint.citizen_verification && (
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Citizen Verification</span>
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                    Fix Verified
                  </span>
                </div>
                {complaint.citizen_verification.rating && (
                  <div className="flex items-center gap-1 text-amber-500">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star 
                        key={star} 
                        size={16} 
                        className={star <= complaint.citizen_verification.rating ? "fill-amber-500" : "text-border"} 
                      />
                    ))}
                    <span className="text-xs text-ink-muted ml-2">
                      ({complaint.citizen_verification.rating} / 5 Stars)
                    </span>
                  </div>
                )}
                {complaint.citizen_verification.feedback && (
                  <p className="text-xs text-ink-secondary italic bg-surface p-3 rounded-lg border border-border">
                    "{complaint.citizen_verification.feedback}"
                  </p>
                )}
              </div>
            )}

            {/* Public Audit Trail History */}
            {complaint.history && complaint.history.length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
                <h3 className="font-semibold text-sm text-ink flex items-center gap-2 border-b border-border pb-3">
                  <Clock size={16} className="text-brand" /> Official Audit History
                </h3>
                <div className="space-y-3 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                  {complaint.history.map((h, i) => (
                    <div key={i} className="flex items-start gap-3 pl-1 text-xs relative">
                      <div className="w-4 h-4 rounded-full bg-brand/20 border-2 border-brand shrink-0 mt-0.5 z-10" />
                      <div className="flex-1 space-y-0.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-ink capitalize">{h.event?.replace(/_/g, " ")}</span>
                          <span className="text-[10px] text-ink-muted">{new Date(h.at).toLocaleString()}</span>
                        </div>
                        <p className="text-ink-secondary text-[11px]">{h.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 text-center text-xs text-ink-muted">
        <p>CivicPortal 311 • High-Performance Municipal Governance & Rapid Response System</p>
      </footer>
    </div>
  );
}
