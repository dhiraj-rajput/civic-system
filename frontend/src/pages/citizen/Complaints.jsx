import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, ChevronRight, FileText, PlusCircle, AlertCircle } from 'lucide-react';
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
      className="bg-card border border-border hover:border-brand/40 rounded-xl shadow-sm p-5 transition-all duration-200 cursor-pointer hover:shadow-md group flex flex-col gap-3"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="font-mono text-xs font-semibold text-ink bg-surface-muted px-2.5 py-1 rounded border border-border shrink-0 group-hover:border-brand/30">
            #{complaint.complaint_id || complaint.id.substring(0, 8)}
          </div>
          {complaint.nyc311_unique_key && (
            <span className="text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full">
              NYC 311 {complaint.borough ? `· ${complaint.borough}` : ''}
            </span>
          )}
          <span className="font-semibold text-ink capitalize text-sm">{complaint.category}</span>
        </div>
        
        <div className="flex items-center gap-2.5 shrink-0">
          <PriorityBadge priority={complaint.priority_label} />
          <StatusBadge status={complaint.status} />
        </div>
      </div>

      <p className="text-sm text-ink-secondary line-clamp-2">
        {complaint.description}
      </p>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-3 border-t border-border/60 text-xs text-ink-muted">
        <div className="flex items-center gap-1.5 truncate max-w-md">
          <MapPin size={13} className="text-brand shrink-0" />
          <span className="truncate">{complaint.address_text || 'New York, NY'}</span>
        </div>
        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
          <span>{formattedDate}</span>
          <span className="text-brand font-medium group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
            Full Details <ChevronRight size={14} />
          </span>
        </div>
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

  const filteredComplaints = useMemo(() => {
    if (!search.trim()) return complaints;
    const term = search.toLowerCase();
    return complaints.filter(
      (c) =>
        c.complaint_id?.toLowerCase().includes(term) ||
        c.category?.toLowerCase().includes(term) ||
        c.description?.toLowerCase().includes(term) ||
        c.status?.toLowerCase().includes(term) ||
        c.borough?.toLowerCase().includes(term) ||
        c.address_text?.toLowerCase().includes(term)
    );
  }, [complaints, search]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="font-serif text-2xl font-bold text-ink">My Reported Issues</h1>
          <p className="text-xs text-ink-muted mt-1">Track case progress, view municipal resolution evidence, and verify fixes.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search reports by keyword, ID, borough..."
              className="w-full rounded-md border border-border bg-card pl-9 pr-3 py-1.5 text-xs text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none"
            />
          </div>
          <Button 
            onClick={() => navigate('/citizen/submit')}
            variant="primary" 
            size="sm"
            className="flex items-center gap-1.5 shrink-0"
          >
            <PlusCircle size={15} /> New Report
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-24 bg-card border border-border rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filteredComplaints.length === 0 ? (
        <div className="text-center py-16 bg-card border border-border rounded-xl space-y-4">
          <div className="w-12 h-12 rounded-full bg-surface-muted flex items-center justify-center mx-auto text-ink-muted">
            <FileText size={24} />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-ink">No complaints found</p>
            <p className="text-xs text-ink-muted max-w-md mx-auto">
              {search ? 'Try adjusting your search terms.' : "You haven't submitted any civic issue reports yet. Spot a pothole or streetlight out?"}
            </p>
          </div>
          <Button onClick={() => navigate('/citizen/submit')} variant="primary" size="sm">
            Report an Issue Now
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredComplaints.map((comp) => (
            <ComplaintCard
              key={comp.id}
              complaint={comp}
            />
          ))}
        </div>
      )}
    </div>
  );
}
