import React, { useState, useEffect, useMemo } from 'react';
import { 
  Filter, Clock, CheckCircle, MessageSquare, Send, 
  ChevronDown, AlertTriangle, Lightbulb, Droplets, Trash2, MoreHorizontal
} from 'lucide-react';
import { api } from '../../api/client.js';
import { useToast } from '../../components/ui/Toast.jsx';
import Button from '../../components/ui/Button.jsx';
import { PriorityBadge } from '../../components/Badges.jsx';
import HistoryTimeline from '../../components/HistoryTimeline.jsx';

const CATEGORY_ICONS = {
  pothole: AlertTriangle,
  garbage: Trash2,
  streetlight: Lightbulb,
  water_supply: Droplets,
  other: MoreHorizontal,
};

function SLATimer({ createdAt, status }) {
  if (status === 'Resolved') {
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

function OfficerComplaintCard({ complaint, onStatusChange, onCommentAdded }) {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [comment, setComment] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  
  const Icon = CATEGORY_ICONS[complaint.category] || CATEGORY_ICONS['Other'];

  const handleStatusChange = async (e) => {
    const newStatus = e.target.value;
    if (newStatus === complaint.status) return;
    
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

  return (
    <div className={`bg-card border border-border border-l-4 rounded-xl shadow-sm overflow-hidden flex flex-col transition-shadow hover:shadow-md ${borderAccent}`}>
      
      {/* Header */}
      <div className="p-4 sm:p-5 flex items-start justify-between gap-4 border-b border-border bg-surface-muted/30">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <PriorityBadge priority={complaint.priority_label} />
          <div className="font-mono text-sm font-medium text-ink bg-card px-2 py-0.5 rounded border border-border">
            #{complaint.id.substring(0, 8)}
          </div>
          <div className="flex items-center gap-2 text-ink-secondary text-sm font-medium">
            <Icon size={16} /> {complaint.category}
          </div>
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
          <span>📍 {complaint.address_text || 'No address provided'}</span>
          <span className="text-brand flex items-center gap-1">
            {expanded ? 'Show less' : 'Read more'} <ChevronDown size={14} className={`transform transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </span>
        </div>

        {expanded && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-border">
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
        )}
      </div>

      {/* Footer / Actions */}
      <div className="p-4 sm:p-5 border-t border-border bg-surface-muted/10 flex flex-col sm:flex-row items-center gap-4">
        
        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
          <label className="text-xs font-medium text-ink-secondary">Status:</label>
          <div className="relative">
            <select
              value={complaint.status}
              onChange={handleStatusChange}
              disabled={isUpdating}
              className="appearance-none bg-card border border-border text-sm font-medium text-ink rounded-md pl-3 pr-8 py-1.5 focus:border-brand focus:ring-1 focus:ring-brand disabled:opacity-50 cursor-pointer"
            >
              <option value="New" disabled>New</option>
              <option value="Assigned">Assigned</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
          </div>
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

  const FILTERS = ['All', 'Assigned', 'In Progress', 'Resolved'];
  const SORTS = ['Priority', 'Newest', 'Oldest'];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 animate-in fade-in duration-500">
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 border-b border-border pb-6">
        <div>
          <h1 className="text-2xl font-bold text-ink">Work Queue</h1>
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
            <div className="flex items-center gap-1 bg-surface-muted p-1 rounded-lg border border-border">
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
              />
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
