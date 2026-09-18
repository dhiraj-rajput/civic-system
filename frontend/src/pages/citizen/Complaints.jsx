import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, ChevronRight, FileText, PlusCircle, AlertCircle, Clock, CheckCircle } from 'lucide-react';
import { api } from '@/api/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import Button from '@/components/ui/Button';
import { StatusBadge, PriorityBadge } from '@/components/Badges';

function ComplaintCard({ complaint }) {
  const navigate = useNavigate();

  const formattedDate = new Date(complaint.created_at).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  });

  return (
    <div 
      onClick={() => navigate(`/citizen/complaints/${complaint.id}`)}
      className="bg-card border border-border hover:border-brand/40 rounded-xl shadow-sm p-4 sm:p-5 transition-all duration-200 cursor-pointer hover:shadow-md group flex flex-col gap-3 active:scale-[0.99]"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="font-mono text-xs font-semibold text-ink bg-surface px-2.5 py-1 rounded border border-border shrink-0 group-hover:border-brand/30">
            #{complaint.complaint_id || complaint.id.substring(0, 8)}
          </div>
          {complaint.nyc311_unique_key && (
            <span className="text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded">
              311 Sync
            </span>
          )}
          <StatusBadge status={complaint.status} />
          <PriorityBadge priority={complaint.priority_label} />
        </div>
        <div className="text-[11px] text-ink-muted">
          {formattedDate}
        </div>
      </div>

      <div className="space-y-1">
        <div className="font-medium text-ink capitalize text-xs sm:text-sm flex items-center gap-1.5">
          {complaint.category?.replace(/_/g, ' ')}
        </div>
        <p className="text-xs text-ink-secondary line-clamp-2 leading-relaxed">
          {complaint.description}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-border text-xs text-ink-muted">
        <div className="flex items-center gap-1.5 truncate">
          <MapPin size={13} className="shrink-0 text-brand" />
          <span className="truncate" title={complaint.address_text}>
            {complaint.borough ? `${complaint.borough} • ` : ''}{complaint.address_text || 'New York, NY'}
          </span>
        </div>
        <span className="text-brand font-medium group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5 self-end sm:self-auto py-1">
          Full Details <ChevronRight size={14} />
        </span>
      </div>
    </div>
  );
}

export default function CitizenComplaints() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('All');

  const fetchComplaints = async () => {
    try {
      const data = await api.get('/complaints/mine');
      setComplaints(data || []);
    } catch (err) {
      toast.error('Failed to load your complaints');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  const counts = useMemo(() => {
    return {
      All: complaints.length,
      Pending: complaints.filter(c => ['New', 'Assigned'].includes(c.status)).length,
      'In Progress': complaints.filter(c => c.status === 'In Progress').length,
      Resolved: complaints.filter(c => c.status === 'Resolved').length,
      Closed: complaints.filter(c => c.status === 'Closed').length,
    };
  }, [complaints]);

  const filteredComplaints = useMemo(() => {
    return complaints.filter((c) => {
      // Tab filter
      if (activeTab === 'Pending' && !['New', 'Assigned'].includes(c.status)) return false;
      if (activeTab === 'In Progress' && c.status !== 'In Progress') return false;
      if (activeTab === 'Resolved' && c.status !== 'Resolved') return false;
      if (activeTab === 'Closed' && c.status !== 'Closed') return false;

      // Search filter
      if (!search.trim()) return true;
      const term = search.toLowerCase();
      return (
        c.complaint_id?.toLowerCase().includes(term) ||
        c.category?.toLowerCase().includes(term) ||
        c.description?.toLowerCase().includes(term) ||
        c.status?.toLowerCase().includes(term) ||
        c.borough?.toLowerCase().includes(term) ||
        c.address_text?.toLowerCase().includes(term)
      );
    });
  }, [complaints, search, activeTab]);

  const TABS = ['All', 'Pending', 'In Progress', 'Resolved', 'Closed'];

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:py-8 space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-ink">My Reported Issues</h1>
          <p className="text-xs text-ink-muted mt-1">Track case progress, inspect field evidence, and verify municipal repairs.</p>
        </div>

        <Button 
          onClick={() => navigate('/citizen/submit')}
          variant="primary" 
          size="sm"
          className="flex items-center justify-center gap-1.5 shrink-0 w-full sm:w-auto min-h-[44px] sm:min-h-[36px]"
        >
          <PlusCircle size={15} /> New Report
        </Button>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 sm:pb-0 scrollbar-none max-w-full">
          {TABS.map((tab) => {
            const count = counts[tab] || 0;
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 min-h-[38px] sm:min-h-[34px] rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 shrink-0 ${
                  isActive
                    ? 'bg-brand text-white shadow-sm'
                    : 'bg-surface hover:bg-surface-hover text-ink-secondary border border-border'
                }`}
              >
                <span>{tab}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  isActive ? 'bg-white/20 text-white' : 'bg-surface-muted text-ink-muted'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-64">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search reports..."
            className="w-full rounded-lg border border-border bg-card pl-9 pr-3 py-2 sm:py-1.5 min-h-[40px] sm:min-h-[36px] text-xs text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none"
          />
        </div>
      </div>

      {/* Complaints List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-24 bg-card border border-border rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filteredComplaints.length === 0 ? (
        <div className="text-center py-14 bg-card border border-border rounded-2xl space-y-4 px-4">
          <div className="w-12 h-12 rounded-full bg-surface flex items-center justify-center mx-auto text-ink-muted">
            <FileText size={22} />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-ink">No complaints found in this view</p>
            <p className="text-xs text-ink-muted max-w-sm mx-auto">
              {search ? 'Try clearing your search query.' : activeTab !== 'All' ? `No issues currently in '${activeTab}' status.` : 'You have not submitted any civic reports yet.'}
            </p>
          </div>
          <Button onClick={() => navigate('/citizen/submit')} variant="primary" size="sm">
            Report an Issue Now
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredComplaints.map((comp) => (
            <ComplaintCard key={comp.id} complaint={comp} />
          ))}
        </div>
      )}
    </div>
  );
}
