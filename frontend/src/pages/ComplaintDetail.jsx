import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Clock,
  Building2,
  User,
  ShieldCheck,
  Sparkles,
  UserPlus,
  Trash2,
  MessageSquare,
  Send,
  AlertTriangle,
  ExternalLink,
  Layers,
  CheckCircle2,
  Compass,
  FileText,
  Info,
  ChevronRight,
  Share2,
  Navigation
} from "lucide-react";

import { api } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ui/Toast";
import Button from "@/components/ui/Button";
import Panel from "@/components/ui/Panel";
import { PriorityBadge, StatusBadge } from "@/components/Badges";
import StatusStepper from "@/components/StatusStepper";
import HistoryTimeline from "@/components/HistoryTimeline";
import MediaGallery from "@/components/MediaGallery";
import PriorityExplainer from "@/components/PriorityExplainer";
import ComplaintMap from "@/components/ComplaintMap";
import CitizenVerificationCard from "@/components/CitizenVerificationCard";
import StarRating from "@/components/StarRating";
import ResolutionEvidenceModal from "@/components/ResolutionEvidenceModal";
import SmartAssignModal from "@/components/SmartAssignModal";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { STATUSES } from "@/constants";

export default function ComplaintDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [complaint, setComplaint] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modals
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [isSmartAssignOpen, setIsSmartAssignOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Form states
  const [commentText, setCommentText] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isReassigning, setIsReassigning] = useState(false);

  const loadComplaint = async () => {
    try {
      setLoading(true);
      const data = await api.get(`/complaints/${id}`);
      setComplaint(data);
    } catch (err) {
      console.error(err);
      setError(err.detail || "Could not load complaint details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComplaint();
    if (user?.role === "admin") {
      api.get("/departments").then(setDepartments).catch(() => {});
    }
  }, [id, user?.role]);

  const handleStatusChange = async (newStatus) => {
    if (!newStatus || newStatus === complaint.status) return;
    if (newStatus === "Resolved") {
      setIsResolveModalOpen(true);
      return;
    }
    setIsUpdatingStatus(true);
    try {
      await api.patch(`/complaints/${complaint.id}/status`, { status: newStatus });
      toast.success(`Status updated to ${newStatus}`);
      loadComplaint();
    } catch (err) {
      toast.error(err.detail || "Failed to update status");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleReassign = async (departmentName) => {
    setIsReassigning(true);
    try {
      await api.patch(`/complaints/${complaint.id}/assign`, departmentName ? { assigned_to: departmentName } : {});
      toast.success(departmentName ? `Assigned to ${departmentName}` : "Auto-assigned by category");
      loadComplaint();
    } catch (err) {
      toast.error(err.detail || "Reassign failed");
    } finally {
      setIsReassigning(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.del(`/complaints/${complaint.id}`);
      toast.success("Complaint deleted");
      navigate(`/${user?.role || "admin"}/complaints`);
    } catch (err) {
      toast.error(err.detail || "Delete failed");
    } finally {
      setIsDeleteModalOpen(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setIsSubmittingComment(true);
    try {
      await api.post(`/complaints/${complaint.id}/comments`, { text: commentText.trim() });
      toast.success("Comment added");
      setCommentText("");
      loadComplaint();
    } catch (err) {
      toast.error(err.detail || "Failed to post comment");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const backLink = `/${user?.role || "citizen"}/complaints`;

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-3 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-ink-muted">Loading complete complaint file...</p>
      </div>
    );
  }

  if (error || !complaint) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center space-y-4">
        <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto">
          <AlertTriangle size={32} />
        </div>
        <h2 className="text-xl font-bold text-ink">Complaint Not Found</h2>
        <p className="text-sm text-ink-secondary">{error || "The requested complaint ID does not exist or you do not have permission to view it."}</p>
        <Button as={Link} to={backLink} variant="outline" className="mt-4">
          <ArrowLeft size={16} /> Return to Complaints
        </Button>
      </div>
    );
  }

  const hasCoordinates = Boolean(complaint.location?.lat && complaint.location?.lng);
  const isNYC311 = Boolean(complaint.nyc311_unique_key);

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-8 space-y-6 animate-in fade-in duration-300">
      
      {/* 1. Breadcrumb & Back Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Link
            to={backLink}
            className="flex items-center gap-1.5 text-xs font-semibold text-ink-secondary hover:text-ink px-3 py-2 sm:py-1.5 min-h-[44px] sm:min-h-[36px] rounded-lg border border-border bg-card hover:bg-hover transition-colors"
          >
            <ArrowLeft size={14} /> Back
          </Link>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sm font-bold text-ink bg-surface-muted px-2.5 py-1 rounded border border-border">
              #{complaint.complaint_id || complaint.id}
            </span>
            {isNYC311 && (
              <span className="text-[11px] font-bold bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-amber-400 border border-slate-200 dark:border-zinc-700 px-2 py-0.5 rounded-full">
                NYC 311 Official Feed
              </span>
            )}
            {complaint.is_duplicate && (
              <span className="text-[11px] font-bold bg-red-500/10 text-red-500 border border-red-500/30 px-2 py-0.5 rounded-full">
                Clustered Duplicate
              </span>
            )}
          </div>
        </div>

        {/* Action Controls for Admin & Officer */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          {user?.role === "admin" && (
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsSmartAssignOpen(true)}
                className="gap-1.5 text-xs min-h-[44px] sm:min-h-[36px] flex-1 sm:flex-initial justify-center"
              >
                <Sparkles size={14} className="text-amber-400" /> Smart Assign
              </Button>

              <div className="relative flex-1 sm:flex-initial">
                <select
                  value={complaint.assigned_to || ""}
                  onChange={(e) => handleReassign(e.target.value)}
                  disabled={isReassigning}
                  className="w-full sm:w-auto min-h-[44px] sm:min-h-[36px] bg-card border border-border text-xs font-medium text-ink rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-amber-400 cursor-pointer"
                >
                  <option value="">Auto Department</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.name}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div className="relative flex-1 sm:flex-initial">
                <select
                  value={complaint.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  disabled={isUpdatingStatus}
                  className="w-full sm:w-auto min-h-[44px] sm:min-h-[36px] bg-card border border-border text-xs font-semibold text-ink rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-amber-400 cursor-pointer"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsDeleteModalOpen(true)}
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10 min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] px-2 flex items-center justify-center"
                title="Delete Complaint"
              >
                <Trash2 size={16} />
              </Button>
            </div>
          )}

          {user?.role === "officer" && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
              <select
                value={complaint.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                disabled={isUpdatingStatus}
                className="bg-card border border-border text-xs font-semibold text-ink rounded-lg px-3 py-2 sm:py-1.5 min-h-[44px] sm:min-h-[36px] focus:outline-none focus:border-amber-400 cursor-pointer w-full sm:w-auto"
              >
                <option value="Assigned">Assigned</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved (Submit Proof)</option>
                <option value="Closed">Closed</option>
                <option value="Reopened">Reopened</option>
              </select>

              {complaint.status !== "Resolved" && complaint.status !== "Closed" && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsResolveModalOpen(true)}
                  className="gap-1.5 text-xs font-semibold min-h-[44px] sm:min-h-[36px] w-full sm:w-auto justify-center"
                >
                  <ShieldCheck size={14} /> Resolve with Evidence
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 2. Top Metric Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Panel className="p-3.5 sm:p-4 flex flex-col justify-between">
          <span className="text-xs font-semibold text-ink-secondary uppercase tracking-wider">Status</span>
          <div className="mt-2 flex items-center gap-2">
            <StatusBadge status={complaint.status} />
          </div>
        </Panel>

        <Panel className="p-3.5 sm:p-4 flex flex-col justify-between">
          <span className="text-xs font-semibold text-ink-secondary uppercase tracking-wider">Priority Score</span>
          <div className="mt-2 flex items-center gap-2">
            <span className="font-mono text-xl font-bold text-ink">{complaint.priority_score} / 100</span>
            <PriorityBadge priority={complaint.priority_label} />
          </div>
        </Panel>

        <Panel className="p-3.5 sm:p-4 flex flex-col justify-between">
          <span className="text-xs font-semibold text-ink-secondary uppercase tracking-wider">Department</span>
          <div className="mt-2 text-sm font-semibold text-ink truncate">
            {complaint.assigned_to || "Auto-routed"}
          </div>
          {complaint.assigned_officer_name && (
            <span className="text-[11px] text-ink-muted">Officer: {complaint.assigned_officer_name}</span>
          )}
        </Panel>

        <Panel className="p-3.5 sm:p-4 flex flex-col justify-between">
          <span className="text-xs font-semibold text-ink-secondary uppercase tracking-wider">Filed Date</span>
          <div className="mt-2 text-sm font-semibold text-ink">
            {new Date(complaint.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </div>
          <span className="text-[11px] text-ink-muted">
            {new Date(complaint.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
          </span>
        </Panel>
      </div>

      {/* 3. Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (2 Cols wide): Issue Details, Attached Media, NYC 311 Telemetry, Map */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Issue Description Card */}
          <Panel className="p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-ink flex items-center gap-2">
                <FileText size={18} className="text-amber-400" />
                Incident Description
              </h3>
              <span className="text-xs font-semibold capitalize px-2.5 py-1 rounded bg-surface-muted text-ink-secondary border border-border">
                {complaint.category?.replace("_", " ")}
              </span>
            </div>

            <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap">
              {complaint.description}
            </p>

            {complaint.address_text && (
              <div className="flex items-center gap-2 pt-2 text-xs text-ink-secondary border-t border-border">
                <MapPin size={14} className="text-amber-400 shrink-0" />
                <span><strong>Address:</strong> {complaint.address_text}</span>
              </div>
            )}
          </Panel>

          {/* Citizen Attached Photos & Videos */}
          {complaint.media_urls && complaint.media_urls.length > 0 && (
            <Panel className="p-6 space-y-3">
              <h3 className="text-base font-bold text-ink flex items-center gap-2 border-b border-border pb-3">
                <Layers size={18} className="text-amber-400" />
                Citizen Attached Media Evidence
              </h3>
              <MediaGallery mediaUrls={complaint.media_urls} title="Uploaded Photos & Videos" />
            </Panel>
          )}

          {/* Resolution Evidence (if resolved) */}
          {complaint.resolution_evidence && (
            <Panel className="p-6 space-y-4 border-l-4 border-l-emerald-500 bg-emerald-500/5">
              <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3">
                <div className="flex items-center gap-2 text-emerald-500 font-bold text-sm">
                  <ShieldCheck size={18} /> Official Resolution Evidence
                </div>
                <span className="text-xs text-ink-muted">
                  Resolved by: {complaint.resolution_evidence.resolved_by_name || complaint.resolution_evidence.resolved_by || "Assigned Officer"}
                </span>
              </div>

              {complaint.resolution_evidence.notes && (
                <div className="bg-card p-3 rounded-lg border border-border text-xs text-ink-secondary leading-relaxed">
                  <strong className="text-ink">Resolution Notes: </strong>
                  {complaint.resolution_evidence.notes}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                {complaint.resolution_evidence.before_image_url && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-ink-muted uppercase tracking-wider">Before Repair</span>
                      <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">Initial State</span>
                    </div>
                    <img
                      src={complaint.resolution_evidence.before_image_url}
                      alt="Before Repair"
                      className="h-48 sm:h-56 w-full object-cover rounded-lg border border-border shadow-sm"
                    />
                  </div>
                )}
                {complaint.resolution_evidence.after_image_url && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">After Repair</span>
                      <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">Resolution Proof</span>
                    </div>
                    <img
                      src={complaint.resolution_evidence.after_image_url}
                      alt="After Repair"
                      className="h-48 sm:h-56 w-full object-cover rounded-lg border border-border shadow-sm"
                    />
                  </div>
                )}
              </div>
            </Panel>
          )}

          {/* Citizen Verification Card (For citizen review upon resolution) */}
          {user?.role === "citizen" && complaint.status === "Resolved" && (
            <CitizenVerificationCard
              complaint={complaint}
              onVerificationComplete={loadComplaint}
            />
          )}

          {/* Permanent Citizen Verification Record (Audit View) */}
          {complaint.citizen_verification && (
            <Panel className="p-4 sm:p-5 border border-border bg-slate-50/50 dark:bg-[#151518] space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="font-semibold text-xs tracking-wider text-ink-muted uppercase">
                  Citizen Verification Record
                </span>
                <span className={`text-xs px-2.5 py-1 rounded-full font-bold self-start sm:self-auto ${
                  complaint.citizen_verification.response === "yes" 
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" 
                    : "bg-red-500/15 text-red-600 dark:text-red-400"
                }`}>
                  {complaint.citizen_verification.response === "yes" ? "Resolution Confirmed" : "Resolution Disputed"}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-ink font-medium leading-relaxed">
                {complaint.citizen_verification.response === "yes" 
                  ? "Citizen verified that the civic issue was successfully resolved." 
                  : "Citizen reported that the issue remains unresolved or needs further action."}
              </p>
              {complaint.citizen_verification.rating && (
                <div className="flex flex-wrap items-center gap-2 pt-1 pb-1">
                  <span className="text-xs font-semibold text-ink-secondary">Citizen Satisfaction Rating:</span>
                  <StarRating value={complaint.citizen_verification.rating} readOnly size={18} />
                </div>
              )}
              {complaint.citizen_verification.feedback && (
                <div className="bg-surface-input p-3 rounded-lg text-xs text-ink-muted border border-border break-words">
                  <span className="font-semibold text-ink">Citizen Feedback:</span> {complaint.citizen_verification.feedback}
                </div>
              )}
              <div className="text-[11px] text-ink-muted">
                Submitted on {new Date(complaint.citizen_verification.verified_at).toLocaleString()}
              </div>
            </Panel>
          )}

          {/* COMPREHENSIVE NYC 311 AUTHENTIC DATA CARD */}
          {isNYC311 && (
            <Panel className="p-6 space-y-5 border border-border bg-slate-50/50 dark:bg-[#121214]">
              <div className="flex items-center justify-between flex-wrap gap-2 border-b border-border pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">🗽</span>
                  <div>
                    <h3 className="text-base font-bold text-ink">NYC 311 Official Dispatch Telemetry</h3>
                    <p className="text-xs text-ink-muted">Verbatim Open Data attributes ingested via Socrata Open Data API</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold bg-slate-200 dark:bg-zinc-800 text-ink px-2.5 py-1 rounded border border-border">
                    Key #{complaint.nyc311_unique_key}
                  </span>
                  <a
                    href={`https://portal.311.nyc.gov/sr-details/?id=${complaint.nyc311_unique_key}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-md hover:bg-hover text-ink-secondary hover:text-amber-400 transition-colors"
                    title="View on NYC 311 Portal"
                  >
                    <ExternalLink size={16} />
                  </a>
                </div>
              </div>

              {/* Data Grid: Complete API Attributes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 text-xs">
                <div className="bg-card p-3 rounded-lg border border-border space-y-1 min-w-0 overflow-hidden">
                  <span className="text-ink-muted uppercase font-semibold text-[10px] tracking-wider block">Agency Code</span>
                  <p className="font-bold text-ink break-words">{complaint.agency || "N/A"}</p>
                </div>

                <div className="bg-card p-3 rounded-lg border border-border space-y-1 sm:col-span-2 min-w-0 overflow-hidden">
                  <span className="text-ink-muted uppercase font-semibold text-[10px] tracking-wider block">Agency Full Name</span>
                  <p className="font-bold text-ink break-words">{complaint.agency_name || complaint.assigned_to || "City Agency"}</p>
                </div>

                <div className="bg-card p-3 rounded-lg border border-border space-y-1 min-w-0 overflow-hidden">
                  <span className="text-ink-muted uppercase font-semibold text-[10px] tracking-wider block">Complaint Type</span>
                  <p className="font-semibold text-ink break-words">{complaint.complaint_type || complaint.category}</p>
                </div>

                <div className="bg-card p-3 rounded-lg border border-border space-y-1 sm:col-span-2 min-w-0 overflow-hidden">
                  <span className="text-ink-muted uppercase font-semibold text-[10px] tracking-wider block">Descriptor</span>
                  <p className="font-semibold text-ink break-words">{complaint.descriptor || "General inspection requirement"}</p>
                </div>

                <div className="bg-card p-3 rounded-lg border border-border space-y-1 min-w-0 overflow-hidden">
                  <span className="text-ink-muted uppercase font-semibold text-[10px] tracking-wider block">Borough</span>
                  <p className="font-bold text-ink break-words">{complaint.borough || "New York"}</p>
                </div>

                <div className="bg-card p-3 rounded-lg border border-border space-y-1 min-w-0 overflow-hidden">
                  <span className="text-ink-muted uppercase font-semibold text-[10px] tracking-wider block">Postal Zip Code</span>
                  <p className="font-mono font-bold text-ink break-words">{complaint.incident_zip || "N/A"}</p>
                </div>

                <div className="bg-card p-3 rounded-lg border border-border space-y-1 min-w-0 overflow-hidden">
                  <span className="text-ink-muted uppercase font-semibold text-[10px] tracking-wider block">Location Format</span>
                  <p className="font-semibold text-ink break-words">{complaint.location_type || "Street / Sidewalk"}</p>
                </div>

                {complaint.street_name && (
                  <div className="bg-card p-3 rounded-lg border border-border space-y-1 sm:col-span-2 min-w-0 overflow-hidden">
                    <span className="text-ink-muted uppercase font-semibold text-[10px] tracking-wider block">Street Name</span>
                    <p className="font-semibold text-ink break-words">{complaint.street_name}</p>
                  </div>
                )}

                {complaint.cross_street_1 && (
                  <div className="bg-card p-3 rounded-lg border border-border space-y-1 min-w-0 overflow-hidden">
                    <span className="text-ink-muted uppercase font-semibold text-[10px] tracking-wider block">Cross Street 1</span>
                    <p className="font-semibold text-ink break-words">{complaint.cross_street_1}</p>
                  </div>
                )}

                {complaint.cross_street_2 && (
                  <div className="bg-card p-3 rounded-lg border border-border space-y-1 min-w-0 overflow-hidden">
                    <span className="text-ink-muted uppercase font-semibold text-[10px] tracking-wider block">Cross Street 2</span>
                    <p className="font-semibold text-ink break-words">{complaint.cross_street_2}</p>
                  </div>
                )}

                {complaint.community_board && (
                  <div className="bg-card p-3 rounded-lg border border-border space-y-1 min-w-0 overflow-hidden">
                    <span className="text-ink-muted uppercase font-semibold text-[10px] tracking-wider block">Community Board</span>
                    <p className="font-semibold text-ink break-words">{complaint.community_board}</p>
                  </div>
                )}

                {complaint.landmark && (
                  <div className="bg-card p-3 rounded-lg border border-border space-y-1 min-w-0 overflow-hidden">
                    <span className="text-ink-muted uppercase font-semibold text-[10px] tracking-wider block">Landmark</span>
                    <p className="font-semibold text-ink break-words">{complaint.landmark}</p>
                  </div>
                )}

                <div className="bg-card p-3 rounded-lg border border-border space-y-1 min-w-0 overflow-hidden">
                  <span className="text-ink-muted uppercase font-semibold text-[10px] tracking-wider block">Open Data Channel</span>
                  <p className="font-semibold text-ink break-words">{complaint.open_data_channel_type || "ONLINE / MOBILE"}</p>
                </div>
              </div>

              {/* Official NYC 311 Resolution Action */}
              {complaint.resolution_description && (
                <div className="p-4 rounded-xl border border-border bg-card space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-ink uppercase tracking-wider flex items-center gap-1.5">
                      <CheckCircle2 size={14} className="text-emerald-500" />
                      Official NYC 311 Municipal Action Taken
                    </span>
                    {complaint.resolution_action_updated_date && (
                      <span className="text-[11px] text-ink-muted font-mono">{complaint.resolution_action_updated_date}</span>
                    )}
                  </div>
                  <p className="text-xs text-ink-secondary leading-relaxed">
                    {complaint.resolution_description}
                  </p>
                </div>
              )}
            </Panel>
          )}

          {/* Interactive Geospatial Map */}
          {hasCoordinates && (
            <Panel className="p-6 space-y-3">
              <div className="flex items-center justify-between border-b border-border pb-3 flex-wrap gap-2">
                <h3 className="text-base font-bold text-ink flex items-center gap-2">
                  <Compass size={18} className="text-amber-400" />
                  Incident GPS Location Pin
                </h3>
                <div className="flex items-center gap-2.5">
                  <a
                    href={`https://maps.google.com/?q=${complaint.location.lat},${complaint.location.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 border border-blue-500/30 transition-colors"
                    title="Open Google Maps Navigation"
                  >
                    <Navigation size={13} />
                    Navigate in Google Maps
                  </a>
                  <span className="font-mono text-xs text-ink-muted">
                    {complaint.location.lat.toFixed(5)}, {complaint.location.lng.toFixed(5)}
                  </span>
                </div>
              </div>

              <div className="rounded-xl overflow-hidden border border-border">
                <ComplaintMap
                  mode="single"
                  lat={complaint.location.lat}
                  lng={complaint.location.lng}
                  zoom={15}
                  height="300px"
                />
              </div>

              <p className="text-xs text-ink-muted">
                Coordinates are indexed spatially via MongoDB <code>2dsphere</code> for radius matching (≤ 200m) in the duplicate clustering pipeline.
              </p>
            </Panel>
          )}

        </div>

        {/* Right Column (1 Col wide): Status Stepper, Explainable Priority, Audit History, Comments */}
        <div className="space-y-6">
          
          {/* Status Stepper */}
          <Panel className="p-5 space-y-3">
            <h4 className="text-xs font-bold text-ink-muted uppercase tracking-wider">
              Resolution Workflow
            </h4>
            <StatusStepper currentStatus={complaint.status} />
          </Panel>

          {/* Explainable Priority Breakdown */}
          <Panel className="p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h4 className="text-xs font-bold text-ink uppercase tracking-wider">
                Explainable Priority
              </h4>
              <PriorityBadge priority={complaint.priority_label} />
            </div>

            <div className="flex items-baseline justify-between">
              <span className="text-sm font-semibold text-ink">Score:</span>
              <span className="font-mono text-2xl font-bold text-amber-500 dark:text-amber-400">
                {complaint.priority_score} <span className="text-xs text-ink-muted font-normal">/ 100</span>
              </span>
            </div>

            {complaint.priority_breakdown ? (
              <div className="space-y-2 pt-2 border-t border-border text-xs">
                <div className="flex justify-between text-ink-secondary">
                  <span>Category Severity:</span>
                  <span className="font-mono font-semibold text-ink">+{complaint.priority_breakdown.category_severity} pts</span>
                </div>
                <div className="flex justify-between text-ink-secondary">
                  <span>Age Urgency ({complaint.priority_breakdown.age_hours?.toFixed(1) || 0}h):</span>
                  <span className="font-mono font-semibold text-ink">+{complaint.priority_breakdown.age_factor} pts</span>
                </div>
                <div className="flex justify-between text-ink-secondary">
                  <span>Cluster Density ({complaint.priority_breakdown.similar_complaints || 0} issues):</span>
                  <span className="font-mono font-semibold text-ink">+{complaint.priority_breakdown.cluster_factor} pts</span>
                </div>
                {complaint.priority_breakdown.safety_factor > 0 && (
                  <div className="flex justify-between text-amber-500 font-medium">
                    <span>Safety Hazard Factor:</span>
                    <span className="font-mono font-semibold">+{complaint.priority_breakdown.safety_factor} pts</span>
                  </div>
                )}
                {complaint.priority_breakdown.summary && (
                  <p className="mt-2 text-[11px] text-ink-muted italic border-t border-border pt-2">
                    "{complaint.priority_breakdown.summary}"
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs text-ink-muted">Standard civic routing priority calculated.</p>
            )}

            {complaint.escalation_history && complaint.escalation_history.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border space-y-1.5">
                <span className="text-[11px] font-bold text-amber-500 uppercase tracking-wider">Escalation Log</span>
                {complaint.escalation_history.map((esc, i) => (
                  <div key={i} className="text-[11px] text-ink-secondary bg-surface-muted p-2 rounded">
                    <strong>{esc.old_priority} &rarr; {esc.new_priority}</strong> ({esc.reason})
                  </div>
                ))}
              </div>
            )}
          </Panel>

          {/* Audit History Timeline */}
          <Panel className="p-4 sm:p-5 space-y-3">
            <h4 className="text-xs font-bold text-ink-muted uppercase tracking-wider">
              Audit Trail & Timeline
            </h4>
            <div className="max-h-80 overflow-y-auto pr-1 scroll-smooth">
              <HistoryTimeline history={complaint.history || []} />
            </div>
          </Panel>

          {/* Official Comments & Discussion */}
          <Panel className="p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h4 className="text-xs font-bold text-ink uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare size={14} className="text-amber-400" />
                Case Comments ({complaint.comments?.length || 0})
              </h4>
            </div>

            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1 scroll-smooth">
              {!complaint.comments || complaint.comments.length === 0 ? (
                <p className="text-xs text-ink-muted text-center py-4">No comments posted yet.</p>
              ) : (
                complaint.comments.map((c, i) => (
                  <div key={i} className="text-xs bg-surface-muted/60 p-2.5 sm:p-3 rounded-lg border border-border space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-ink capitalize truncate">
                        {c.author_name} <span className="font-normal text-ink-muted">({c.author_role})</span>
                      </span>
                      <span className="text-[10px] text-ink-muted font-mono shrink-0">
                        {new Date(c.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-ink-secondary leading-relaxed break-words">{c.text}</p>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleAddComment} className="pt-2 border-t border-border flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write an official note or message..."
                className="flex-1 min-h-[44px] sm:min-h-[36px] bg-surface-input border border-border rounded-lg px-3 py-2 text-xs text-ink placeholder:text-ink-muted focus:outline-none focus:border-amber-400 w-full"
                disabled={isSubmittingComment}
              />
              <Button 
                type="submit" 
                variant="primary" 
                size="sm" 
                disabled={!commentText.trim() || isSubmittingComment}
                className="min-h-[44px] sm:min-h-[36px] px-4 w-full sm:w-auto flex items-center justify-center gap-1.5 font-semibold shrink-0"
              >
                <Send size={13} />
                <span>Post Note</span>
              </Button>
            </form>
          </Panel>

        </div>

      </div>

      {/* Helper Modals */}
      {isResolveModalOpen && (
        <ResolutionEvidenceModal
          complaintId={complaint.id}
          isOpen={isResolveModalOpen}
          onClose={() => setIsResolveModalOpen(false)}
          onResolved={() => {
            setIsResolveModalOpen(false);
            loadComplaint();
          }}
        />
      )}

      {isSmartAssignOpen && (
        <SmartAssignModal
          complaint={complaint}
          isOpen={isSmartAssignOpen}
          onClose={() => setIsSmartAssignOpen(false)}
          onAssigned={() => {
            setIsSmartAssignOpen(false);
            loadComplaint();
          }}
        />
      )}

      {isDeleteModalOpen && (
        <ConfirmModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleDelete}
          title="Delete Complaint"
          message={`Are you sure you want to permanently delete complaint #${complaint.complaint_id}? This action cannot be undone.`}
          confirmLabel="Delete Complaint"
          variant="danger"
        />
      )}

    </div>
  );
}
