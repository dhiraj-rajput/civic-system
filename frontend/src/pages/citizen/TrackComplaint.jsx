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

  const basePath = user?.role ? `/${user.role}/track` : '/citizen/track';
  const complaintsBasePath = user?.role ? `/${user.role}/complaints` : '/citizen/complaints';

  // Load citizen complaints with local fallback & CMP- prioritization
  useEffect(() => {
    async function loadCitizenHistory() {
      try {
        const endpoint = user?.role === "citizen" ? "/complaints/mine" : "/complaints?limit=30";
        const res = await api.get(endpoint);
        let list = Array.isArray(res) ? [...res] : [];

        // Check local storage for any newly created complaints
        try {
          const localIds = JSON.parse(localStorage.getItem("civic_citizen_recent_ids") || "[]");
          if (localIds.length > 0) {
            const existingIds = new Set(list.map((c) => c.complaint_id || c.id));
            const missingIds = localIds.filter((id) => !existingIds.has(id));
            for (const mId of missingIds.slice(0, 5)) {
              try {
                const doc = await api.get(`/complaints/${encodeURIComponent(mId)}`);
                if (doc) list.unshift(doc);
              } catch (e) {
                try {
                  const docPub = await api.get(`/complaints/public-track/${encodeURIComponent(mId)}`);
                  if (docPub) list.unshift(docPub);
                } catch (e2) {}
              }
            }
          }
        } catch (e) {}

        // Prioritize citizen-created issues (CMP- prefix) and newest submissions first
        list.sort((a, b) => {
          const aIsUser = String(a.complaint_id || a.id).startsWith("CMP-");
          const bIsUser = String(b.complaint_id || b.id).startsWith("CMP-");
          if (aIsUser && !bIsUser) return -1;
          if (!aIsUser && bIsUser) return 1;
          return new Date(b.created_at || 0) - new Date(a.created_at || 0);
        });

        setMyRecentComplaints(list);

        // Auto-select latest active issue if none selected
        if (!routeId && list.length > 0) {
          const defaultTarget = list.find((c) => c.status !== "Closed") || list[0];
          const targetId = defaultTarget.complaint_id || defaultTarget.id;
          setSearchId(targetId);
          fetchComplaint(targetId);
        }
      } catch (err) {
        console.error("Failed to load complaint history:", err);
      }
    }

    if (user) {
      loadCitizenHistory();
    }
  }, [user, routeId]);

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
    navigate(`${basePath}/${encodeURIComponent(searchId.trim())}`);
    fetchComplaint(searchId.trim());
  };

  const handleQuickSelect = (complaintId) => {
    setSearchId(complaintId);
    navigate(`${basePath}/${encodeURIComponent(complaintId)}`);
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
      </Panel>

      {/* Submission History: IDs & Issues with live ongoing updates and completed redirect */}
      <Panel className="p-5 sm:p-6 shadow-sm border border-border space-y-3">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h2 className="font-semibold text-sm sm:text-base text-ink flex items-center gap-2">
            <Clock size={16} className="text-brand" />
            Your Reported Issues History
          </h2>
          <span className="text-xs text-ink-muted">
            {myRecentComplaints.length} report{myRecentComplaints.length !== 1 ? "s" : ""} logged
          </span>
        </div>

        {myRecentComplaints.length === 0 ? (
          <div className="text-center py-8 space-y-3">
            <p className="text-xs text-ink-muted">
              You have not filed any civic complaints yet.
            </p>
            <Link to="/citizen/submit">
              <Button variant="primary" size="sm">
                Report a New Issue
              </Button>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[540px]">
              <thead>
                <tr className="border-b border-border text-ink-muted uppercase tracking-wider text-[10px]">
                  <th className="pb-2.5 font-semibold">Ticket ID</th>
                  <th className="pb-2.5 font-semibold">Issue</th>
                  <th className="pb-2.5 font-semibold">Live Progress & Update</th>
                  <th className="pb-2.5 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {myRecentComplaints.map((c) => {
                  const id = c.complaint_id || c.id;
                  const isCompleted = c.status === "Resolved" || c.status === "Closed";
                  const isSelected =
                    searchId === id ||
                    (complaint && (complaint.complaint_id === id || complaint.id === id));

                  // Live progress description
                  let updateText = "Intake received — awaiting dispatch";
                  if (c.status === "Assigned") {
                    updateText = `Dispatched to ${c.assigned_to || "Department"}`;
                  } else if (c.status === "In Progress") {
                    updateText = `Field crew dispatched · Working on site`;
                  } else if (c.status === "Resolved") {
                    updateText = `Repairs completed · Citizen verification open`;
                  } else if (c.status === "Closed") {
                    updateText = `Resolution confirmed & case closed`;
                  }

                  return (
                    <tr
                      key={id}
                      onClick={() => {
                        if (isCompleted) {
                          navigate(`${complaintsBasePath}/${id}`);
                        } else {
                          handleQuickSelect(id);
                        }
                      }}
                      className={`cursor-pointer transition-colors hover:bg-surface-hover ${
                        isSelected ? "bg-brand/5 font-medium" : ""
                      }`}
                    >
                      <td className="py-3 font-mono font-bold text-brand whitespace-nowrap">
                        #{id}
                      </td>
                      <td className="py-3 capitalize text-ink whitespace-nowrap font-medium">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-brand/60 shrink-0"></span>
                          {c.category?.replace(/_/g, " ") || "Civic Issue"}
                        </span>
                      </td>
                      <td className="py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <StatusBadge status={c.status} />
                          <span className="text-[11px] text-ink-muted">
                            {updateText}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 text-right whitespace-nowrap">
                        {isCompleted ? (
                          <Link
                            to={`${complaintsBasePath}/${id}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 px-3 text-xs flex items-center gap-1 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 ml-auto"
                            >
                              View Details & Audit <ArrowRight size={12} />
                            </Button>
                          </Link>
                        ) : (
                          <Button
                            type="button"
                            variant={isSelected ? "primary" : "outline"}
                            size="sm"
                            className="h-7 px-3 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleQuickSelect(id);
                            }}
                          >
                            {isSelected ? "Tracking Live" : "Track Live"}
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
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

            {/* Attached Citizen Media or Official NYC 311 Telemetry Banner */}
            {(() => {
              const isNYC311 = Boolean(complaint.nyc311_unique_key || complaint.agency);
              const validMediaUrls = (complaint.media_urls || []).filter(
                (url) => !url.includes("sample_1.jpg") && !url.includes("placeholder") && !url.includes("fake")
              );

              if (validMediaUrls.length > 0) {
                return (
                  <div className="pt-2">
                    <MediaGallery mediaUrls={validMediaUrls} title="Attached Media Evidence" />
                  </div>
                );
              }

              if (isNYC311) {
                return (
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-900/40 space-y-1.5">
                    <div className="flex items-center gap-2 text-slate-800 dark:text-amber-400 font-semibold text-xs">
                      <ShieldCheck size={16} className="text-amber-500" />
                      <span>Official NYC 311 Municipal Open Data Record</span>
                    </div>
                    <p className="text-[11px] text-ink-secondary leading-relaxed">
                      Photographic records are managed internally by the responding agency (<strong>{complaint.agency || "NYC Municipal Services"}</strong>) and are not published via the public Open Data feed. Municipal telemetry verified under Socrata #{complaint.nyc311_unique_key || complaint.id}.
                    </p>
                  </div>
                );
              }

              return null;
            })()}

            {/* Full Details Deep Link */}
            <div className="pt-3 border-t border-border flex justify-end">
              <Link to={`${complaintsBasePath}/${complaint.id || complaint.complaint_id}`}>
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
