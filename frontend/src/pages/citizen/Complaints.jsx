import React, { useState, useEffect, useMemo } from 'react';
import { Search, ChevronDown, ChevronUp, MessageSquare, Send } from 'lucide-react';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import Button from '../../components/ui/Button.jsx';
import { StatusBadge, PriorityBadge } from '../../components/Badges.jsx';
import StatusStepper from '../../components/StatusStepper.jsx';
import HistoryTimeline from '../../components/HistoryTimeline.jsx';

// Debounce hook
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

function ComplaintCard({ complaint, isExpanded, onToggle, onCommentAdded }) {
  const { toast } = useToast();
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    
    setIsSubmitting(true);
    try {
      await api.post(`/complaints/${complaint.id}/comments`, { content: commentText });
      toast.success('Comment added');
      setCommentText('');
      onCommentAdded();
    } catch (err) {
      toast.error('Failed to add comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formattedDate = new Date(complaint.created_at).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  });

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden transition-all duration-200">
      <div 
        className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-surface-hover transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center gap-4">
          <div className="font-mono text-sm text-ink bg-surface-muted px-2 py-1 rounded border border-border shrink-0">
            #{complaint.id.substring(0, 8)}
          </div>
          <div className="font-medium text-ink">{complaint.category}</div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <PriorityBadge priority={complaint.priority} />
          <StatusBadge status={complaint.status} />
          <div className="text-sm text-ink-muted w-24 text-right hidden sm:block">{formattedDate}</div>
          <div className="text-ink-muted ml-2">
            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-border bg-surface-muted/30 p-5 sm:p-6 space-y-8 animate-in slide-in-from-top-2 fade-in duration-200">
          
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-ink">Description</h4>
            <p className="text-sm text-ink-secondary whitespace-pre-wrap">{complaint.description}</p>
            <div className="text-xs text-ink-muted mt-2">📍 {complaint.address}</div>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-ink">Progress</h4>
            <div className="bg-card p-6 rounded-lg border border-border shadow-sm">
              <StatusStepper currentStatus={complaint.status} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-ink">Timeline</h4>
              <div className="bg-card p-5 rounded-lg border border-border shadow-sm max-h-[400px] overflow-y-auto">
                <HistoryTimeline history={complaint.history} />
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-ink flex items-center gap-2">
                <MessageSquare size={16} /> Comments
              </h4>
              <div className="bg-card rounded-lg border border-border shadow-sm flex flex-col h-full max-h-[400px]">
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {!complaint.comments || complaint.comments.length === 0 ? (
                    <div className="text-sm text-ink-muted text-center py-8">No comments yet.</div>
                  ) : (
                    complaint.comments.map((c, i) => (
                      <div key={i} className="flex flex-col gap-1">
                        <div className="flex items-baseline justify-between">
                          <span className="text-xs font-semibold text-ink">{c.user_name}</span>
                          <span className="text-[10px] text-ink-muted">
                            {new Date(c.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="text-sm text-ink-secondary bg-surface-muted p-2.5 rounded-md border border-border">
                          {c.content}
                        </div>
                      </div>
                    ))
                  )}
                </div>
                
                <form onSubmit={handleSubmitComment} className="p-3 border-t border-border flex gap-2 bg-surface-muted rounded-b-lg">
                  <input
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Add a comment..."
                    className="flex-1 rounded-md border border-border bg-card px-3 py-1.5 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                  />
                  <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting} disabled={!commentText.trim()}>
                    <Send size={14} />
                  </Button>
                </form>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

export default function CitizenComplaints() {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const { toast } = useToast();

  const debouncedSearch = useDebounce(searchQuery, 300);

  const fetchComplaints = async () => {
    try {
      const data = await api.get('/complaints/mine');
      setComplaints(data || []);
    } catch (err) {
      toast.error('Failed to load complaints');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  const TABS = ['All', 'Open', 'In Progress', 'Resolved'];

  const filteredComplaints = useMemo(() => {
    return complaints.filter((c) => {
      // Tab filter
      if (activeTab === 'Open' && c.status !== 'New' && c.status !== 'Assigned') return false;
      if (activeTab === 'In Progress' && c.status !== 'In Progress') return false;
      if (activeTab === 'Resolved' && c.status !== 'Resolved') return false;
      
      // Search filter
      if (debouncedSearch) {
        const query = debouncedSearch.toLowerCase();
        return (
          c.id.toLowerCase().includes(query) ||
          c.description.toLowerCase().includes(query) ||
          c.category.toLowerCase().includes(query)
        );
      }
      return true;
    }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [complaints, activeTab, debouncedSearch]);

  const counts = useMemo(() => {
    return {
      All: complaints.length,
      Open: complaints.filter(c => c.status === 'New' || c.status === 'Assigned').length,
      'In Progress': complaints.filter(c => c.status === 'In Progress').length,
      Resolved: complaints.filter(c => c.status === 'Resolved').length,
    };
  }, [complaints]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 animate-in fade-in duration-500">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-ink">My Complaints</h1>
          <p className="text-ink-secondary text-sm mt-1">Track and manage your reported issues.</p>
        </div>
        
        <div className="relative w-full sm:w-64">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-ink-muted">
            <Search size={16} />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search complaints..."
            className="w-full rounded-md border border-border bg-card pl-9 pr-4 py-2 text-sm text-ink focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand shadow-sm"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-2 no-scrollbar">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setExpandedId(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === tab 
                ? 'bg-ink text-card shadow-md' 
                : 'bg-card text-ink-secondary border border-border hover:bg-surface-hover'
            }`}
          >
            {tab}
            <span className={`px-2 py-0.5 rounded-full text-[10px] ${
              activeTab === tab ? 'bg-card/20 text-card' : 'bg-surface-muted text-ink-muted'
            }`}>
              {counts[tab]}
            </span>
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {loading ? (
          // Loading Skeletons
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-5 flex items-center justify-between animate-pulse">
              <div className="flex gap-4 items-center">
                <div className="h-6 w-20 bg-border rounded"></div>
                <div className="h-5 w-24 bg-border rounded"></div>
              </div>
              <div className="flex gap-3">
                <div className="h-6 w-16 bg-border rounded-full"></div>
                <div className="h-6 w-20 bg-border rounded-full"></div>
              </div>
            </div>
          ))
        ) : filteredComplaints.length === 0 ? (
          // Empty State
          <div className="bg-card border border-border border-dashed rounded-xl p-12 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-surface-muted rounded-full flex items-center justify-center mb-4 text-ink-muted">
              <Search size={24} />
            </div>
            <h3 className="text-lg font-medium text-ink mb-1">No complaints found</h3>
            <p className="text-sm text-ink-secondary">
              {searchQuery ? "No results match your search." : `You have no ${activeTab.toLowerCase()} complaints.`}
            </p>
          </div>
        ) : (
          // List
          filteredComplaints.map(c => (
            <ComplaintCard
              key={c.id}
              complaint={c}
              isExpanded={expandedId === c.id}
              onToggle={() => setExpandedId(expandedId === c.id ? null : c.id)}
              onCommentAdded={fetchComplaints}
            />
          ))
        )}
      </div>

    </div>
  );
}
