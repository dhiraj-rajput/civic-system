import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Filter, Clock, CheckCircle, MessageSquare, Send, 
  ChevronDown, AlertTriangle, Lightbulb, Droplets, Trash2, MoreHorizontal,
  MapPin, ShieldCheck, CheckSquare, ChevronRight
} from 'lucide-react';
import { api } from '../../api/client.js';
import { useToast } from '../../components/ui/Toast.jsx';
import Button from '../../components/ui/Button.jsx';
import { PriorityBadge } from '../../components/Badges.jsx';
import HistoryTimeline from '../../components/HistoryTimeline.jsx';
import PriorityExplainer from '../../components/PriorityExplainer.jsx';
import MediaGallery from '../../components/MediaGallery.jsx';
import ComplaintMap from '../../components/ComplaintMap.jsx';
import ResolutionEvidenceModal from '../../components/ResolutionEvidenceModal.jsx';

const CATEGORY_ICONS = {
  pothole: AlertTriangle,
  garbage: Trash2,
  streetlight: Lightbulb,
  water_supply: Droplets,
  other: MoreHorizontal,
};

function SLATimer({ createdAt, status }) {
  if (status === 'Resolved' || status === 'Closed') {
    return <span className="text-xs font-medium text-success bg-success/10 px-2 py-1 rounded-full">Resolved</span>;
  }
  
  const created = new Date(createdAt);
  const now = new Date();
  const hoursElapsed = (now - created) / (1000 * 60 * 60);
  const hoursLeft = 72 - hoursElapsed;

  if (hoursLeft < 0) {
    return (
      <span className="text-xs font-bold text-danger bg-danger/10 px-2 py-1 rounded-full animate-pulse border border-danger/30">
        OVERDUE {Math.abs(Math.floor(hoursLeft))}h
      </span>
    );
  }
  if (hoursLeft < 24) {
    return (
      <span className="text-xs font-medium text-warning-dark bg-warning/20 px-2 py-1 rounded-full">
        Due in {Math.floor(hoursLeft)}h
      </span>
    );
  }
  
  return (
    <span className="text-xs font-medium text-ink-muted bg-surface-muted px-2 py-1 rounded-full border border-border">
      {Math.floor(hoursLeft)}h remaining
    </span>
  );
}

function OfficerComplaintCard({ complaint, onStatusChange, onCommentAdded, onOpenResolve }) {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [comment, setComment] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  
  const Icon = CATEGORY_ICONS[complaint.category] || CATEGORY_ICONS['other'] || MoreHorizontal;

  const handleStatusSelect = async (e) => {
    const newStatus = e.target.value;
    if (newStatus === complaint.status) return;

    if (newStatus === 'Resolved') {
      onOpenResolve(complaint);
      return;
    }
    
    setIsUpdating(true);
    try {
      await onStatusChange(complaint.id, newStatus);
      toast.success(`Status updated to ${newStatus}`);
    } catch (err) {
      toast.error('Failed to update status');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    
    setIsUpdating(true);
    try {
      await api.post(`/complaints/${complaint.id}/comments`, { text: comment });
      toast.success('Comment added');
      setComment('');
      onCommentAdded();
    } catch (err) {
      toast.error('Failed to add comment');
    } finally {
      setIsUpdating(false);
    }
  };

  const borderAccent = 
    complaint.priority_label === 'Critical' ? 'border-l-danger' :
    complaint.priority_label === 'High' ? 'border-l-warning' :
    complaint.priority_label === 'Medium' ? 'border-l-status-assigned' : 'border-l-priority-low';

  const hasLocation = complaint.location?.lat && complaint.location?.lng;

  return (
    <div className={`bg-card border border-border border-l-4 rounded-xl shadow-sm overflow-hidden flex flex-col transition-shadow hover:shadow-md ${borderAccent}`}>
      
      {/* Header */}
      <div className="p-4 sm:p-5 flex items-start justify-between gap-4 border-b border-border bg-surface-muted/30">
        <div className="flex flex-wrap items-center gap-3">
          <PriorityBadge priority={complaint.priority_label} />
          <PriorityExplainer
            priorityLabel={complaint.priority_label}
            priorityScore={complaint.priority_score}
            breakdown={complaint.priority_breakdown}
            escalationHistory={complaint.escalation_history}
          />
          <div className="font-mono text-sm font-medium text-ink bg-card px-2 py-0.5 rounded border border-border">
            #{complaint.id?.substring(0, 8) || complaint.complaint_id}
          </div>
          {complaint.nyc311_unique_key && (
            <span className="text-[11px] font-semibold bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-amber-400 border border-slate-200 dark:border-zinc-700 px-2 py-0.5 rounded-full">
              NYC 311 {complaint.borough ? `· ${complaint.borough}` : ''}
            </span>
          )}
          <div className="flex items-center gap-2 text-ink-secondary text-sm font-medium">
            <Icon size={16} /> {complaint.category}
          </div>
          {complaint.is_duplicate && (
            <span className="text-[11px] font-semibold bg-danger/10 text-danger border border-danger/30 px-2 py-0.5 rounded-full">
              Clustered Issue
            </span>
          )}
        </div>
        <SLATimer createdAt={complaint.created_at} status={complaint.status} />
      </div>

      {/* Body */}
      <div 
        className="p-4 sm:p-5 cursor-pointer hover:bg-surface-hover/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className={`text-sm text-ink-secondary ${expanded ? 'whitespace-pre-wrap' : 'line-clamp-2'}`}>
          {complaint.description}
        </div>
        <div className="text-xs text-ink-muted mt-3 flex items-center justify-between">
          <span className="flex items-center gap-1">
            <MapPin size={13} className="text-ink-muted" /> {complaint.address_text || 'No address provided'}
          </span>
          <span className="text-brand flex items-center gap-1 font-medium">
            {expanded ? 'Show less' : 'Read more'} <ChevronDown size={14} className={`transform transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </span>
        </div>

        {expanded && (
          <div className="mt-4 pt-4 border-t border-border space-y-4">

            {/* NYC 311 Source Information */}
            {(complaint.nyc311_unique_key || complaint.agency || complaint.descriptor) && (
              <div className="rounded-xl border border-border bg-slate-50 dark:bg-zinc-900/60 p-4 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-ink">
                  <span>NYC 311 Dispatch Record</span>
                  <span className="font-mono text-ink-secondary">Key: #{complaint.nyc311_unique_key || complaint.complaint_id}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-ink-secondary">
                  <div><strong className="text-ink">Agency:</strong> {complaint.agency} {complaint.agency_name ? `(${complaint.agency_name})` : ''}</div>
                  <div><strong className="text-ink">Borough & Zip:</strong> {complaint.borough || 'N/A'} {complaint.incident_zip || ''}</div>
                  {complaint.descriptor && (
                    <div className="sm:col-span-2"><strong className="text-ink">Issue Descriptor:</strong> {complaint.descriptor}</div>
                  )}
                </div>
                {complaint.resolution_description && (
                  <div className="bg-card p-2.5 rounded border border-border text-xs text-ink-secondary mt-1">
                    <strong className="text-ink">Standard NYC 311 Resolution:</strong> {complaint.resolution_description}
                  </div>
                )}
              </div>
            )}
            
            {/* Citizen Attached Media */}
            {complaint.media_urls && complaint.media_urls.length > 0 && (
              <div className="bg-surface-muted/20 p-3 rounded-lg border border-border">
                <MediaGallery mediaUrls={complaint.media_urls} title="Citizen Attached Photos & Videos" />
              </div>
            )}

            {/* Resolution Evidence (if resolved) */}
            {complaint.resolution_evidence && (
              <div className="p-4 rounded-lg border border-success/30 bg-success/5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold text-success">
                    <ShieldCheck size={18} /> Official Resolution Evidence
                  </div>
                  <span className="text-xs text-ink-muted">
                    Resolved by {complaint.resolution_evidence.resolved_by_name || 'Assigned Officer'}
                  </span>
                </div>
                {complaint.resolution_evidence.notes && (
                  <p className="text-sm text-ink-secondary bg-card p-3 rounded border border-border">
                    {complaint.resolution_evidence.notes}
                  </p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {complaint.resolution_evidence.before_image_url && (
                    <div>
                      <span className="text-xs font-semibold text-ink-muted uppercase">Before Repair</span>
                      <img 
                        src={complaint.resolution_evidence.before_image_url} 
                        alt="Before repair" 
                        className="mt-1 h-40 w-full object-cover rounded-md border border-border" 
                      />
                    </div>
                  )}
                  {complaint.resolution_evidence.after_image_url && (
                    <div>
                      <span className="text-xs font-semibold text-ink-muted uppercase">After Repair</span>
                      <img 
                        src={complaint.resolution_evidence.after_image_url} 
                        alt="After repair" 
                        className="mt-1 h-40 w-full object-cover rounded-md border border-border" 
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Map Pin for Location */}
            {hasLocation && (
              <div>
                <h5 className="text-xs font-semibold text-ink-secondary uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <MapPin size={14} className="text-brand" /> Incident Location
                </h5>
                <ComplaintMap 
                  mode="single" 
                  lat={complaint.location.lat} 
                  lng={complaint.location.lng} 
                  zoom={15}
                  height="220px"
                />
              </div>
            )}

            {/* Timeline & Comments */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h5 className="text-xs font-semibold text-ink-secondary uppercase tracking-wide mb-2">Timeline</h5>
                <div className="bg-surface-muted/40 rounded-md border border-border p-2 max-h-[220px] overflow-y-auto">
                  <HistoryTimeline history={complaint.history || []} />
                </div>
              </div>
              <div>
                <h5 className="text-xs font-semibold text-ink-secondary uppercase tracking-wide mb-2">Comments</h5>
                <div className="bg-surface-muted/40 rounded-md border border-border p-3 max-h-[220px] overflow-y-auto space-y-2">
                  {!complaint.comments || complaint.comments.length === 0 ? (
                    <div className="text-xs text-ink-muted text-center py-4">No comments yet.</div>
                  ) : (
                    complaint.comments.map((c, i) => (
                      <div key={i} className="text-xs">
                        <div className="flex items-baseline justify-between">
                          <span className="font-semibold text-ink capitalize">{c.author_name} ({c.author_role})</span>
                          <span className="text-ink-muted">{new Date(c.created_at).toLocaleDateString()}</span>
                        </div>
                        <div className="text-ink-secondary bg-card p-2 rounded border border-border mt-0.5">{c.text}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

          </div>
        )}
      </div>

      {/* Footer / Actions */}
      <div className="p-4 sm:p-5 border-t border-border bg-surface-muted/10 flex flex-col sm:flex-row items-center gap-4">
        
        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
          <label className="text-xs font-medium text-ink-secondary">Status:</label>
          <div className="relative">
            <select
              value={complaint.status}
              onChange={handleStatusSelect}
              disabled={isUpdating}
              className="appearance-none bg-card border border-border text-sm font-medium text-ink rounded-md pl-3 pr-8 py-1.5 focus:border-brand focus:ring-1 focus:ring-brand disabled:opacity-50 cursor-pointer"
            >
              <option value="New" disabled>New</option>
              <option value="Assigned">Assigned</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved (Submit Evidence)</option>
              <option value="Closed">Closed</option>
              <option value="Reopened">Reopened</option>
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
          </div>

          {complaint.status !== 'Resolved' && complaint.status !== 'Closed' && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenResolve(complaint)}
              className="ml-2 text-xs border-success/40 text-success hover:bg-success/10 flex items-center gap-1.5"
            >
              <CheckSquare size={14} /> Resolve Issue
            </Button>
          )}
        </div>

        <div className="w-px h-8 bg-border hidden sm:block"></div>

        <form onSubmit={handleComment} className="flex-1 flex gap-2 w-full">
          <div className="relative flex-1">
            <MessageSquare size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              type="text"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add official comment or update..."
              className="w-full bg-card border border-border rounded-md pl-9 pr-3 py-1.5 text-sm focus:border-brand focus:ring-1 focus:ring-brand disabled:opacity-50"
              disabled={isUpdating}
            />
          </div>
          <Button type="submit" variant="primary" size="sm" disabled={!comment.trim() || isUpdating}>
            <Send size={14} />
          </Button>
        </form>

      </div>
    </div>
  );
}

export default function OfficerComplaints() {
  const { toast } = useToast();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resolvingComplaint, setResolvingComplaint] = useState(null);
  
  const [activeFilter, setActiveFilter] = useState('All');
  const [sortBy, setSortBy] = useState('Priority');

  const fetchComplaints = async () => {
    try {
      const data = await api.get('/complaints');
      setComplaints(data || []);
    } catch (err) {
      toast.error('Failed to load queue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  const handleStatusChange = async (id, newStatus) => {
    await api.patch(`/complaints/${id}/status`, { status: newStatus });
    setComplaints(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c));
  };

  const filteredAndSorted = useMemo(() => {
    let result = [...complaints];
    
    if (activeFilter !== 'All') {
      result = result.filter(c => c.status === activeFilter);
    }

    result.sort((a, b) => {
      if (sortBy === 'Priority') {
        const scoreA = a.priority_score || 0;
        const scoreB = b.priority_score || 0;
        if (scoreA !== scoreB) return scoreB - scoreA;
        return new Date(a.created_at) - new Date(b.created_at);
      }
      if (sortBy === 'Newest') {
        return new Date(b.created_at) - new Date(a.created_at);
      }
      if (sortBy === 'Oldest') {
        return new Date(a.created_at) - new Date(b.created_at);
      }
      return 0;
    });

    return result;
  }, [complaints, activeFilter, sortBy]);

  const FILTERS = ['All', 'Assigned', 'In Progress', 'Resolved', 'Closed', 'Reopened'];
  const SORTS = ['Priority', 'Newest', 'Oldest'];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 animate-in fade-in duration-500">
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 border-b border-border pb-6">
        <div>
          <h1 className="font-serif text-2xl font-bold text-ink">Work Queue</h1>
          <p className="text-ink-secondary text-sm mt-1 flex items-center gap-2">
            <span className="font-medium text-ink bg-surface-muted px-2 py-0.5 rounded border border-border">
              {filteredAndSorted.length}
            </span> 
            complaints matching filters
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider">Status Filter</label>
            <div className="flex flex-wrap items-center gap-1 bg-surface-muted p-1 rounded-lg border border-border">
              {FILTERS.map(f => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    activeFilter === f ? 'bg-card text-ink shadow-sm' : 'text-ink-secondary hover:text-ink'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider">Sort By</label>
            <div className="relative">
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="appearance-none bg-card border border-border text-sm font-medium text-ink rounded-lg pl-3 pr-8 py-2 w-full sm:w-32 focus:border-brand focus:ring-1 focus:ring-brand cursor-pointer shadow-sm"
              >
                {SORTS.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <Filter size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="space-y-4">
            {Array.from({length: 3}).map((_,i) => (
              <div key={i} className="h-48 bg-card border border-border rounded-xl animate-pulse"></div>
            ))}
          </div>
        ) : filteredAndSorted.length === 0 ? (
          <div className="bg-card border border-border border-dashed rounded-xl p-16 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mb-4">
              <CheckCircle size={32} className="text-success" />
            </div>
            <h3 className="text-lg font-medium text-ink mb-1">You're all caught up!</h3>
            <p className="text-sm text-ink-secondary">No complaints found for the current filters.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {filteredAndSorted.map(c => (
              <OfficerComplaintCard 
                key={c.id} 
                complaint={c} 
                onStatusChange={handleStatusChange}
                onCommentAdded={fetchComplaints}
                onOpenResolve={(complaint) => setResolvingComplaint(complaint)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Resolution Evidence Modal */}
      {resolvingComplaint && (
        <ResolutionEvidenceModal
          complaintId={resolvingComplaint.id}
          isOpen={!!resolvingComplaint}
          onClose={() => setResolvingComplaint(null)}
          onResolved={() => {
            setResolvingComplaint(null);
            fetchComplaints();
          }}
        />
      )}

    </div>
  );
}
