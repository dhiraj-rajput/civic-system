import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { 
  Search, ShieldCheck, CheckCircle2, Clock, AlertTriangle, 
  MapPin, Building, ArrowRight, ExternalLink, Calendar, 
  Sparkles, Image, RefreshCw, FileText, ChevronDown, ChevronRight,
  Eye, Check, Compass
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
  const [expandedId, setExpandedId] = useState(routeId || null);
  const [myRecentComplaints, setMyRecentComplaints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const basePath = user?.role ? `/${user.role}/track` : "/citizen/track";
  const complaintsBasePath = user?.role ? `/${user.role}/complaints` : "/citizen/complaints";

  // Helper to normalize IDs
  const getId = (item) => item?.complaint_id || item?.id || "";

  // Load citizen complaint history with local storage fallback & CMP- prioritization
  useEffect(() => {
    async function loadCitizenHistory() {
      try {
        const endpoint = user?.role === "citizen" ? "/complaints/mine" : "/complaints?limit=30";
        const res = await api.get(endpoint);
        let list = Array.isArray(res) ? [...res] : [];

        // Check local storage for any recently created complaints
        try {
          const localIds = JSON.parse(localStorage.getItem("civic_citizen_recent_ids") || "[]");
          if (localIds.length > 0) {
            const existingIds = new Set(list.map((c) => getId(c)));
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
          const aIsUser = String(getId(a)).startsWith("CMP-");
          const bIsUser = String(getId(b)).startsWith("CMP-");
          if (aIsUser && !bIsUser) return -1;
          if (!aIsUser && bIsUser) return 1;
          return new Date(b.created_at || 0) - new Date(a.created_at || 0);
        });

        setMyRecentComplaints(list);

        // If routeId is given, make sure it is expanded
        if (routeId) {
          setExpandedId(routeId);
          fetchComplaint(routeId);
        } else if (list.length > 0 && !expandedId) {
          // By default, open the first active issue so the user immediately sees live progress
          const defaultTarget = list.find((c) => c.status !== "Closed") || list[0];
          const targetId = getId(defaultTarget);
          setExpandedId(targetId);
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
      setExpandedId(routeId);
      fetchComplaint(routeId);
    }
  }, [routeId]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchId.trim()) return;
    const target = searchId.trim();
    navigate(`${basePath}/${encodeURIComponent(target)}`);

    // Match in table list
    const found = myRecentComplaints.find(
      (c) => getId(c).toLowerCase() === target.toLowerCase()
    );

    if (found) {
      setExpandedId(getId(found));
    } else {
      setExpandedId(null);
    }
    fetchComplaint(target);
  };

  const toggleRowDropdown = (rowComplaint) => {
    const id = getId(rowComplaint);
    if (expandedId === id) {
      // Toggle close
      setExpandedId(null);
    } else {
      // Open dropdown
      setExpandedId(id);
      setSearchId(id);
      // Fetch fresh live details
      fetchComplaint(id);
    }
  };

  const getProgressUpdateText = (status, assignedTo) => {
    switch (status) {
      case "New":
        return "Intake logged — awaiting triage & dispatch";
      case "Assigned":
        return `Assigned to ${assignedTo || "Department"} — review in progress`;
      case "In Progress":
        return "Field crew on site — active resolution in progress";
      case "Resolved":
        return "Repairs completed — open for citizen verification";
      case "Closed":
        return "Resolution confirmed & case closed";
      default:
        return "Status update pending";
    }
  };

  const renderTrackingDossier = (targetComplaint) => {
    if (!targetComplaint) return null;

    const isNYC311 = Boolean(targetComplaint.nyc311_unique_key || targetComplaint.agency);
    const validMediaUrls = (targetComplaint.media_urls || []).filter(
      (url) => !url.includes("sample_1.jpg") && !url.includes("placeholder") && !url.includes("fake")
    );

    return (
      <div className="bg-card border border-brand/25 rounded-2xl p-4 sm:p-6 shadow-sm space-y-5 animate-in slide-in-from-top-2 fade-in duration-200">
        {/* Header with ID, Status & Target SLA */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="font-mono text-sm sm:text-base font-bold text-brand">
                #{getId(targetComplaint)}
              </span>
              <StatusBadge status={targetComplaint.status} />
              <PriorityBadge priority={targetComplaint.priority_label} />
            </div>
            <h3 className="text-base font-bold text-ink capitalize">
              {targetComplaint.category?.replace(/_/g, " ")} Issue
            </h3>
          </div>
          <div className="text-xs text-ink-muted sm:text-right">
            <div>Filed: {new Date(targetComplaint.created_at).toLocaleDateString()}</div>
            <div>Target SLA: {targetComplaint.category === "pothole" ? "48h" : "72h"}</div>
          </div>
        </div>

        {/* Visual Resolution Workflow Stepper */}
        <div className="bg-surface/60 border border-border rounded-xl p-3.5 sm:p-4">
          <div className="flex items-center justify-between mb-2.5">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
              Live Lifecycle Progression
            </h4>
            <span className="text-[11px] font-medium text-brand">
              Step: {targetComplaint.status}
            </span>
          </div>
          <StatusStepper currentStatus={targetComplaint.status} />
        </div>

        {/* Grid Attributes */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="bg-surface p-3 rounded-xl border border-border space-y-1">
            <span className="text-ink-muted uppercase font-semibold text-[10px] tracking-wider block">
              Location / Address
            </span>
            <p className="font-semibold text-ink flex items-center gap-1.5 truncate">
              <MapPin size={14} className="text-brand shrink-0" />
              <span className="truncate">{targetComplaint.address_text || "Coordinates on file"}</span>
            </p>
          </div>

          <div className="bg-surface p-3 rounded-xl border border-border space-y-1">
            <span className="text-ink-muted uppercase font-semibold text-[10px] tracking-wider block">
              Assigned Department
            </span>
            <p className="font-semibold text-ink flex items-center gap-1.5 capitalize">
              <Building size={14} className="text-brand shrink-0" />
              <span className="truncate">{targetComplaint.assigned_to || "Intake Triage Queue"}</span>
            </p>
          </div>

          <div className="bg-surface p-3 rounded-xl border border-border space-y-1">
            <span className="text-ink-muted uppercase font-semibold text-[10px] tracking-wider block">
              Priority Rating
            </span>
            <p className="font-mono font-bold text-ink">
              {targetComplaint.priority_score} <span className="font-normal text-ink-muted text-[11px]">/ 100 pts</span>
            </p>
          </div>
        </div>

        {/* Description */}
        {targetComplaint.description && (
          <div className="space-y-1 bg-surface p-3.5 rounded-xl border border-border">
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
              Report Description
            </span>
            <p className="text-xs text-ink leading-relaxed whitespace-pre-line">
              {targetComplaint.description}
            </p>
          </div>
        )}

        {/* Media or Official Banner */}
        {validMediaUrls.length > 0 && (
          <div className="pt-1">
            <MediaGallery mediaUrls={validMediaUrls} title="Attached Media Evidence" />
          </div>
        )}

        {isNYC311 && validMediaUrls.length === 0 && (
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-900/40 space-y-1">
            <div className="flex items-center gap-2 text-slate-800 dark:text-amber-400 font-semibold text-xs">
              <ShieldCheck size={16} className="text-amber-500" />
              <span>Official NYC 311 Municipal Open Data Record</span>
            </div>
            <p className="text-[11px] text-ink-secondary leading-relaxed">
              Photographic records are managed internally by the responding agency (<strong>{targetComplaint.agency || "NYC Municipal Services"}</strong>) and are not published via the public Open Data feed. Municipal telemetry verified under Socrata #{targetComplaint.nyc311_unique_key || targetComplaint.id}.
            </p>
          </div>
        )}

        {/* Deep Link to Details & Verification */}
        <div className="pt-2 border-t border-border flex items-center justify-between gap-3">
          <span className="text-xs text-ink-muted hidden sm:inline">
            Full audit timeline & comments are available on the details page.
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setExpandedId(null)}
              className="text-xs text-ink-muted hover:text-ink"
            >
              Close Dropdown
            </Button>
            <Link to={`${complaintsBasePath}/${targetComplaint.id || targetComplaint.complaint_id}`}>
              <Button variant="primary" size="sm" className="flex items-center gap-1.5 text-xs">
                View Full Audit & Comments <ArrowRight size={13} />
              </Button>
            </Link>
          </div>
        </div>

        {/* Citizen Verification Card (If Resolved) */}
        {targetComplaint.status === "Resolved" && (
          <CitizenVerificationCard
            complaint={targetComplaint}
            onVerificationComplete={() => fetchComplaint(getId(targetComplaint))}
          />
        )}
      </div>
    );
  };

  // Check if searched complaint is not already displayed in recent table
  const isSearchNotInTable =
    complaint &&
    !myRecentComplaints.some((c) => getId(c) === getId(complaint));

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

      {/* Standalone Dossier if searched ticket is NOT in myRecentComplaints */}
      {isSearchNotInTable && (
        <div className="space-y-2 animate-in fade-in duration-300">
          <div className="flex items-center gap-2 text-xs font-semibold text-brand">
            <Sparkles size={15} />
            <span>Search Result for Reference #{getId(complaint)}</span>
          </div>
          {renderTrackingDossier(complaint)}
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs sm:text-sm flex items-start gap-3">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          <div>
            <div className="font-bold">Lookup Failed</div>
            <div>{error}</div>
          </div>
        </div>
      )}

      {/* Table of Reported Issues with Click-to-Expand Dropdown */}
      <Panel className="p-5 sm:p-6 shadow-sm border border-border space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
          <div>
            <h2 className="font-semibold text-sm sm:text-base text-ink flex items-center gap-2">
              <Clock size={16} className="text-brand" />
              Your Reported Issues
            </h2>
            <p className="text-[11px] text-ink-muted">
              Click any row below to open its real-time tracking dropdown and lifecycle workflow.
            </p>
          </div>
          <span className="text-xs text-ink-muted">
            {myRecentComplaints.length} report{myRecentComplaints.length !== 1 ? "s" : ""} logged
          </span>
        </div>

        {myRecentComplaints.length === 0 ? (
          <div className="text-center py-10 space-y-3">
            <div className="w-12 h-12 rounded-full bg-brand/10 text-brand flex items-center justify-center mx-auto">
              <Compass size={24} />
            </div>
            <p className="text-xs text-ink-muted">
              You haven't reported any civic complaints yet.
            </p>
            <Link to="/citizen/submit">
              <Button variant="primary" size="sm">
                Report a New Issue
              </Button>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[620px] border-collapse">
              <thead>
                <tr className="border-b border-border text-ink-muted uppercase tracking-wider text-[10px] bg-surface/40">
                  <th className="py-2.5 px-3 font-semibold w-10"></th>
                  <th className="py-2.5 px-3 font-semibold">Ticket ID</th>
                  <th className="py-2.5 px-3 font-semibold">Issue Category</th>
                  <th className="py-2.5 px-3 font-semibold">Live Progress & Update</th>
                  <th className="py-2.5 px-3 font-semibold">Date Filed</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {myRecentComplaints.map((c) => {
                  const id = getId(c);
                  const isExpanded = expandedId === id;
                  const isCompleted = c.status === "Resolved" || c.status === "Closed";
                  const activeComplaintData = (complaint && getId(complaint) === id) ? complaint : c;
                  const updateText = getProgressUpdateText(c.status, c.assigned_to);

                  return (
                    <React.Fragment key={id}>
                      <tr
                        onClick={() => toggleRowDropdown(c)}
                        className={`cursor-pointer transition-colors duration-150 select-none ${
                          isExpanded
                            ? "bg-brand/10 dark:bg-brand/15 font-medium"
                            : "hover:bg-surface-hover"
                        }`}
                      >
                        {/* Dropdown Chevron Indicator */}
                        <td className="py-3 px-3 w-10 text-center">
                          <ChevronDown
                            size={16}
                            className={`transition-transform duration-200 inline-block ${
                              isExpanded ? "rotate-180 text-brand" : "text-ink-muted"
                            }`}
                          />
                        </td>

                        {/* Ticket ID */}
                        <td className="py-3 px-3 font-mono font-bold text-brand whitespace-nowrap">
                          #{id}
                        </td>

                        {/* Issue Category */}
                        <td className="py-3 px-3 capitalize text-ink whitespace-nowrap font-medium">
                          <span className="inline-flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-brand/60 shrink-0"></span>
                            {c.category?.replace(/_/g, " ") || "Civic Issue"}
                          </span>
                        </td>

                        {/* Live Progress & Status */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <StatusBadge status={c.status} />
                            <span className="text-[11px] text-ink-muted">
                              {updateText}
                            </span>
                          </div>
                        </td>

                        {/* Date Filed */}
                        <td className="py-3 px-3 text-ink-muted whitespace-nowrap text-[11px]">
                          {new Date(c.created_at || Date.now()).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric"
                          })}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              type="button"
                              variant={isExpanded ? "primary" : "outline"}
                              size="sm"
                              className="h-7 px-2.5 text-xs flex items-center gap-1"
                              onClick={() => toggleRowDropdown(c)}
                            >
                              <span>{isExpanded ? "Close" : "Track"}</span>
                              <ChevronDown
                                size={12}
                                className={`transition-transform duration-200 ${
                                  isExpanded ? "rotate-180" : ""
                                }`}
                              />
                            </Button>
                            <Link to={`${complaintsBasePath}/${id}`}>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 px-2 text-xs flex items-center gap-1 text-ink-muted hover:text-ink"
                                title="View Full Audit & Discussion"
                              >
                                <ExternalLink size={12} />
                              </Button>
                            </Link>
                          </div>
                        </td>
                      </tr>

                      {/* Dropdown Row: Opens Directly Underneath The Clicked Row */}
                      {isExpanded && (
                        <tr className="bg-surface/50 dark:bg-zinc-950/40">
                          <td colSpan={6} className="p-3 sm:p-5 border-b border-border">
                            <div className="border-l-4 border-l-brand pl-3 sm:pl-4">
                              {loading && (!complaint || getId(complaint) !== id) ? (
                                <div className="p-8 flex items-center justify-center gap-2 text-xs text-ink-muted">
                                  <RefreshCw size={16} className="animate-spin text-brand" />
                                  <span>Loading live complaint telemetry...</span>
                                </div>
                              ) : (
                                renderTrackingDossier(activeComplaintData)
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}

