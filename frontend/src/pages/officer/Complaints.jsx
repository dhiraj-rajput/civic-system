import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Filter, CheckCircle, ChevronDown, AlertTriangle, Lightbulb, 
  Droplets, Trash2, MoreHorizontal, MapPin, CheckSquare, ChevronRight,
  Clock, ShieldCheck, Navigation
} from 'lucide-react';
import { api } from '../../api/client.js';
import { useToast } from '../../components/ui/Toast.jsx';
import Button from '../../components/ui/Button.jsx';
import { PriorityBadge, StatusBadge } from '../../components/Badges.jsx';
import PriorityExplainer from '../../components/PriorityExplainer.jsx';
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
    return <span className="text-xs font-medium text-success bg-success/10 px-2.5 py-1 rounded-full border border-success/30">Resolved</span>;
  }
  
  const created = new Date(createdAt);
  const now = new Date();
  const hoursElapsed = (now - created) / (1000 * 60 * 60);
  const hoursLeft = 72 - hoursElapsed;

  if (hoursLeft < 0) {
    return (
      <span className="text-xs font-bold text-danger bg-danger/10 px-2.5 py-1 rounded-full animate-pulse border border-danger/30">
        OVERDUE {Math.abs(Math.floor(hoursLeft))}h
      </span>
    );
  }
  if (hoursLeft < 24) {
    return (
      <span className="text-xs font-medium text-warning-dark bg-warning/20 px-2.5 py-1 rounded-full border border-warning/30">
        Due in {Math.floor(hoursLeft)}h
      </span>
    );
  }
  
  return (
    <span className="text-xs font-medium text-ink-muted bg-surface-muted px-2.5 py-1 rounded-full border border-border">
      {Math.floor(hoursLeft)}h remaining
    </span>
  );
}

function OfficerComplaintCard({ complaint, onStatusChange, onOpenResolve }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);
  
  const Icon = CATEGORY_ICONS[complaint.category] || CATEGORY_ICONS['other'] || MoreHorizontal;

  const handleStartTask = async (e) => {
    e.stopPropagation();
    setIsUpdating(true);
    try {
      await onStatusChange(complaint.id, 'In Progress');
      toast.success('Task started! Status updated to In Progress');
    } catch (err) {
      toast.error('Failed to start task');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleStatusSelect = async (e) => {
    e.stopPropagation();
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

  const borderAccent = 
    complaint.priority_label === 'Critical' ? 'border-l-danger' :
    complaint.priority_label === 'High' ? 'border-l-warning' :
    complaint.priority_label === 'Medium' ? 'border-l-status-assigned' : 'border-l-priority-low';

  return (
    <div 
      onClick={() => navigate(`/officer/complaints/${complaint.id}`)}
      className={`bg-card border border-border border-l-4 rounded-xl shadow-sm overflow-hidden flex flex-col transition-all duration-200 hover:shadow-md cursor-pointer group ${borderAccent}`}
    >
      
      {/* Header */}
      <div className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface-muted/30">
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          <PriorityBadge priority={complaint.priority_label} />
          <PriorityExplainer
            priorityLabel={complaint.priority_label}
            priorityScore={complaint.priority_score}
            breakdown={complaint.priority_breakdown}
            escalationHistory={complaint.escalation_history}
          />
          <div className="font-mono text-xs font-semibold text-ink bg-card px-2.5 py-1 rounded border border-border">
            #{complaint.id?.substring(0, 8) || complaint.complaint_id}
          </div>
          {complaint.nyc311_unique_key && (
            <span className="text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full">
              NYC 311 {complaint.borough ? `· ${complaint.borough}` : ''}
            </span>
          )}
          <div className="flex items-center gap-1.5 text-ink-secondary text-xs font-medium capitalize">
            <Icon size={15} /> {complaint.category}
          </div>
          {complaint.is_duplicate && (
            <span className="text-[11px] font-semibold bg-danger/10 text-danger border border-danger/30 px-2 py-0.5 rounded-full">
              Clustered Issue
            </span>
          )}
        </div>
        <SLATimer createdAt={complaint.created_at} status={complaint.status} />
      </div>

      {/* Body Preview */}
      <div className="p-4 sm:p-5 flex flex-col gap-3">
        <div className="text-sm text-ink-secondary line-clamp-2">
          {complaint.description}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-border/60 text-xs text-ink-muted">
          <div className="flex items-center gap-2 truncate max-w-md">
            <div className="flex items-center gap-1.5 truncate">
              <MapPin size={13} className="text-brand shrink-0" />
              <span className="truncate">{complaint.address_text || 'New York, NY'}</span>
            </div>
            {complaint.location?.lat && complaint.location?.lng && (
              <a
                href={`https://maps.google.com/?q=${complaint.location.lat},${complaint.location.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 text-[11px] font-semibold min-h-[32px] sm:min-h-0 px-2.5 py-1 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 border border-blue-500/30 transition-colors shrink-0"
                title="Open GPS Navigation in Google Maps"
              >
                <Navigation size={12} />
                Navigate
              </a>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {complaint.agency && (
              <span className="font-semibold text-ink">{complaint.agency}</span>
            )}
            <span className="text-brand font-medium group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
              Open Case Dossier <ChevronRight size={14} />
            </span>
          </div>
        </div>
      </div>

      {/* Footer / Quick Actions */}
      <div 
        onClick={(e) => e.stopPropagation()}
        className="px-4 py-3 sm:px-5 border-t border-border bg-surface-muted/20 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs"
      >
        <div className="flex items-center justify-between sm:justify-start gap-2 w-full sm:w-auto">
          <label className="text-ink-muted font-medium shrink-0">Quick Status:</label>
          <div className="relative flex-1 sm:flex-initial">
            <select
              value={complaint.status}
              onChange={handleStatusSelect}
              disabled={isUpdating}
              className="w-full sm:w-auto min-h-[44px] sm:min-h-[36px] appearance-none bg-card border border-border text-xs font-medium text-ink rounded-lg pl-3 pr-8 py-2 focus:border-brand focus:ring-1 focus:ring-brand disabled:opacity-50 cursor-pointer"
            >
              <option value="New" disabled>New</option>
              <option value="Assigned">Assigned</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
              <option value="Reopened">Reopened</option>
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          {complaint.status === 'Assigned' && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={isUpdating}
              onClick={handleStartTask}
              className="min-h-[44px] sm:min-h-[36px] text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center justify-center gap-1.5 px-3.5 w-full sm:w-auto shadow-sm"
            >
              ▶ Start Task
            </Button>
          )}
          {complaint.status !== 'Resolved' && complaint.status !== 'Closed' && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenResolve(complaint)}
              className="min-h-[44px] sm:min-h-[36px] text-xs border-success/40 text-success hover:bg-success/10 flex items-center justify-center gap-1.5 px-3.5 w-full sm:w-auto"
            >
              <CheckSquare size={14} /> Resolve Issue
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/officer/complaints/${complaint.id}`)}
            className="min-h-[44px] sm:min-h-[36px] text-xs text-brand hover:bg-brand/10 flex items-center justify-center gap-1 px-3 w-full sm:w-auto"
          >
            Full View →
          </Button>
        </div>
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
    <div className="mx-auto max-w-5xl px-4 py-8 animate-in fade-in duration-300">
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 border-b border-border pb-6">
        <div>
          <h1 className="font-serif text-2xl font-bold text-ink">Municipal Work Queue</h1>
          <p className="text-ink-secondary text-sm mt-1 flex items-center gap-2">
            <span className="font-medium text-ink bg-surface-muted px-2 py-0.5 rounded border border-border">
              {filteredAndSorted.length}
            </span> 
            complaints matching filters
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          <div className="space-y-1.5 flex-1 sm:flex-initial">
            <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider block">Status Filter</label>
            <div className="flex flex-wrap items-center gap-1.5 bg-surface-muted p-1.5 rounded-lg border border-border">
              {FILTERS.map(f => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={`min-h-[44px] sm:min-h-[32px] px-3.5 py-1.5 text-xs font-medium rounded-md transition-all flex items-center justify-center ${
                    activeFilter === f ? 'bg-card text-ink shadow-sm' : 'text-ink-secondary hover:text-ink'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider block">Sort By</label>
            <div className="relative">
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="appearance-none bg-card border border-border text-xs sm:text-sm font-medium text-ink rounded-lg pl-3 pr-8 py-2 min-h-[44px] sm:min-h-[36px] w-full sm:w-36 focus:border-brand focus:ring-1 focus:ring-brand cursor-pointer shadow-sm"
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
              <div key={i} className="h-32 bg-card border border-border rounded-xl animate-pulse"></div>
            ))}
          </div>
        ) : filteredAndSorted.length === 0 ? (
          <div className="bg-card border border-border border-dashed rounded-xl p-16 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mb-4">
              <CheckCircle size={32} className="text-success" />
            </div>
            <h3 className="text-lg font-medium text-ink mb-1">Queue is Clear</h3>
            <p className="text-sm text-ink-secondary">No complaints currently matched under this filter.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {filteredAndSorted.map(c => (
              <OfficerComplaintCard 
                key={c.id} 
                complaint={c} 
                onStatusChange={handleStatusChange}
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
