import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { 
  Search, ShieldCheck, CheckCircle2, Clock, AlertTriangle, 
  MapPin, Building, ArrowRight, ExternalLink, Calendar, 
  Sparkles, Image, RefreshCw, FileText
} from "lucide-react";
import { api } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import { PriorityBadge, StatusBadge } from "@/components/Badges";
import StatusStepper from "@/components/StatusStepper";
import MediaGallery from "@/components/MediaGallery";
import CitizenVerificationCard from "@/components/CitizenVerificationCard";
import Button from "@/components/ui/Button";
import Panel from "@/components/ui/Panel";

export default function TrackComplaint() {
  const { id: routeId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [searchId, setSearchId] = useState(routeId || "");
  const [complaint, setComplaint] = useState(null);
  const [myRecentComplaints, setMyRecentComplaints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Load user's recent complaints for 1-click tracking
  useEffect(() => {
    if (user?.role === "citizen") {
      api.get("/complaints?limit=6")
        .then((res) => setMyRecentComplaints(res || []))
        .catch(() => {});
    }
  }, [user]);

  const fetchComplaint = async (targetId) => {
    if (!targetId || !targetId.trim()) return;
    setLoading(true);
    setError("");
    setComplaint(null);
    try {
      // First try authenticated complaint lookup
      const data = await api.get(`/complaints/${encodeURIComponent(targetId.trim())}`);
      setComplaint(data);
    } catch (err) {
      // Fallback to public-track endpoint if cross-citizen or seed reference
      try {
        const publicData = await api.get(`/complaints/public-track/${encodeURIComponent(targetId.trim())}`);
        setComplaint(publicData);
      } catch (err2) {
        setError(err2?.response?.data?.detail || "No civic complaint found with that reference ID. Please verify your reference number.");
      }
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
    navigate(`/citizen/track/${encodeURIComponent(searchId.trim())}`);
    fetchComplaint(searchId.trim());
  };

  const handleQuickSelect = (complaintId) => {
    setSearchId(complaintId);
    navigate(`/citizen/track/${encodeURIComponent(complaintId)}`);
    fetchComplaint(complaintId);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="border-b border-border pb-4 space-y-1">
        <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-ink">
          Track Civic Complaint
        </h1>
        <p className="text-xs sm:text-sm text-ink-muted">
          Look up the real-time dispatch, officer assignment, and resolution progress of any municipal issue.
        </p>
      </div>

      {/* Search Bar Panel */}
      <Panel className="p-5 sm:p-6 shadow-sm border border-border">
        <form onSubmit={handleSearch} className="space-y-4">
          <label className="block text-xs font-semibold uppercase tracking-wider text-ink-muted">
            Enter Reference / Ticket ID
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" />
              <input
                type="text"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                placeholder="e.g. CMP-2026-0001, 70436093, or MongoDB ID"
                className="w-full rounded-xl border border-border bg-surface-input pl-10 pr-4 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand font-mono"
              />
            </div>
            <Button 
              type="submit" 
              variant="primary" 
              disabled={loading || !searchId.trim()}
              className="flex items-center justify-center gap-2 sm:w-36"
            >
              {loading ? (
                <>
                  <RefreshCw size={15} className="animate-spin" /> Looking up...
                </>
              ) : (
                <>
                  <Search size={15} /> Track Now
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Quick select chips from recent complaints */}
        {myRecentComplaints.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border/60">
            <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider block mb-2">
              Your Recent Submissions (Quick Select):
            </span>
            <div className="flex flex-wrap gap-2">
              {myRecentComplaints.map((c) => (
                <button
                  key={c.id || c.complaint_id}
                  type="button"
                  onClick={() => handleQuickSelect(c.complaint_id || c.id)}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition-all text-left flex items-center gap-1.5 ${
                    searchId === (c.complaint_id || c.id)
                      ? "border-brand bg-brand/10 text-brand font-semibold"
                      : "border-border bg-surface hover:bg-surface-hover text-ink"
                  }`}
                >
                  <span className="font-mono font-bold text-[11px]">#{c.complaint_id}</span>
                  <span className="text-ink-muted capitalize text-[11px]">({c.category})</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </Panel>

      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs sm:text-sm flex items-start gap-3">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          <div>
            <div className="font-bold">Lookup Failed</div>
            <div>{error}</div>
          </div>
        </div>
      )}

      {/* Result Complaint Dossier */}
      {complaint && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Main Info Card */}
          <Panel className="p-5 sm:p-6 border border-border space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-sm sm:text-base font-bold text-brand">
                    #{complaint.complaint_id || complaint.id}
                  </span>
                  <StatusBadge status={complaint.status} />
                  <PriorityBadge priority={complaint.priority_label} />
                </div>
                <h2 className="text-lg font-bold text-ink capitalize">
                  {complaint.category?.replace(/_/g, " ")} Issue
                </h2>
              </div>
              <div className="text-xs text-ink-muted sm:text-right">
                <div>Filed: {new Date(complaint.created_at).toLocaleDateString()}</div>
                <div>Target SLA: {complaint.category === "pothole" ? "48h" : "72h"}</div>
              </div>
            </div>

            {/* Visual Resolution Workflow Stepper */}
            <div className="bg-surface/50 border border-border rounded-xl p-4 sm:p-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-3">
                Lifecycle Progression
              </h3>
              <StatusStepper currentStatus={complaint.status} />
            </div>

            {/* Grid Attributes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
              <div className="bg-card p-3.5 rounded-xl border border-border space-y-1">
                <span className="text-ink-muted uppercase font-semibold text-[10px] tracking-wider block">
                  Location / Address
                </span>
                <p className="font-semibold text-ink flex items-center gap-1.5">
                  <MapPin size={14} className="text-brand shrink-0" />
                  <span className="truncate">{complaint.address_text || "Coordinates on file"}</span>
                </p>
              </div>

              <div className="bg-card p-3.5 rounded-xl border border-border space-y-1">
                <span className="text-ink-muted uppercase font-semibold text-[10px] tracking-wider block">
                  Assigned Department
                </span>
                <p className="font-semibold text-ink flex items-center gap-1.5">
                  <Building size={14} className="text-brand shrink-0" />
                  <span className="capitalize">{complaint.assigned_to || "Intake Triage Queue"}</span>
                </p>
              </div>

              <div className="bg-card p-3.5 rounded-xl border border-border space-y-1">
                <span className="text-ink-muted uppercase font-semibold text-[10px] tracking-wider block">
                  Priority Rating
                </span>
                <p className="font-mono font-bold text-ink">
                  {complaint.priority_score} <span className="font-normal text-ink-muted text-[11px]">/ 100 pts</span>
                </p>
              </div>
            </div>

            {/* Description */}
            {complaint.description && (
              <div className="space-y-1.5 bg-surface p-4 rounded-xl border border-border">
                <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                  Report Description
                </span>
                <p className="text-xs text-ink leading-relaxed whitespace-pre-line">
                  {complaint.description}
                </p>
              </div>
            )}

            {/* Attached Citizen Media */}
            {complaint.media_urls && complaint.media_urls.length > 0 && (
              <div className="pt-2">
                <MediaGallery mediaUrls={complaint.media_urls} title="Citizen Attached Media" />
              </div>
            )}

            {/* Full Details Deep Link */}
            <div className="pt-3 border-t border-border flex justify-end">
              <Link to={`/citizen/complaints/${complaint.id || complaint.complaint_id}`}>
                <Button variant="outline" size="sm" className="flex items-center gap-1.5 text-xs">
                  View Full Audit & Comments <ArrowRight size={14} />
                </Button>
              </Link>
            </div>
          </Panel>

          {/* Citizen Verification Card (If Resolved) */}
          {complaint.status === "Resolved" && (
            <CitizenVerificationCard
              complaint={complaint}
              onVerificationComplete={() => fetchComplaint(complaint.complaint_id || complaint.id)}
            />
          )}
        </div>
      )}
    </div>
  );
}
