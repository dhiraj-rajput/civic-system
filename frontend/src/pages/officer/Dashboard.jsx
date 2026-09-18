import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  Building2, Users, AlertTriangle, 
  CheckCircle2, Clock, ShieldAlert, ArrowRight, CheckCircle
} from 'lucide-react';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import Button from '../../components/ui/Button.jsx';
import StatCard from '../../components/StatCard.jsx';
import { StatusBadge, PriorityBadge } from '../../components/Badges.jsx';

function formatRelativeTime(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
  
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays}d ago`;
}

export default function OfficerDashboard() {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/complaints')
      .then((data) => setComplaints(data || []))
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  // Stats
  const assigned = complaints.filter(c => c.status === 'Assigned' || c.status === 'New').length;
  const pendingReview = complaints.filter(c => c.status === 'Assigned' && !c.priority_score).length; 
  // Note: Adjust pendingReview definition based on actual backend flags if needed, fallback to Assigned for now
  const inProgress = complaints.filter(c => c.status === 'In Progress').length;
  
  const today = new Date().toDateString();
  const resolvedToday = complaints.filter(c => 
    c.status === 'Resolved' && new Date(c.updated_at || c.created_at).toDateString() === today
  ).length;

  // Priority Queue
  const priorityQueue = useMemo(() => {
    return [...complaints]
      .filter(c => !['Resolved', 'Closed'].includes(c.status))
      .sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0))
      .slice(0, 5);
  }, [complaints]);

  // SLA Warnings (created > 48h ago, not resolved or closed)
  const slaWarnings = useMemo(() => {
    const now = new Date();
    return complaints.filter(c => {
      if (['Resolved', 'Closed'].includes(c.status)) return false;
      const created = new Date(c.created_at);
      const hoursElapsed = (now - created) / (1000 * 60 * 60);
      return hoursElapsed > 48;
    }).map(c => {
      const hoursElapsed = Math.floor((now - new Date(c.created_at)) / (1000 * 60 * 60));
      return { ...c, hoursElapsed };
    }).sort((a, b) => b.hoursElapsed - a.hoursElapsed);
  }, [complaints]);

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8 animate-in fade-in duration-500">
      
      {/* Department Banner */}
      <div className="bg-card border border-border text-ink rounded-xl p-4 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 sm:gap-4">
          <div className="w-11 h-11 sm:w-12 sm:h-12 bg-slate-100 dark:bg-zinc-800 rounded-xl flex items-center justify-center border border-border text-slate-800 dark:text-amber-400 shrink-0">
            <Building2 size={24} />
          </div>
          <div>
            <h1 className="font-serif text-xl sm:text-2xl font-bold text-ink">{user?.department || 'City Services'} Department</h1>
            <p className="text-ink-secondary mt-0.5 text-xs sm:text-sm flex items-center gap-2">
              <Users size={14} /> Officer: {user?.name}
            </p>
          </div>
        </div>
        
        <Button as={Link} to="/officer/complaints" variant="primary" className="min-h-[44px] sm:min-h-[36px] w-full sm:w-auto justify-center">
          Go to Work Queue <ArrowRight size={16} />
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard label="Assigned to Dept" value={loading ? '-' : assigned} tone="blue" icon={AlertTriangle} />
        <StatCard label="Pending Review" value={loading ? '-' : pendingReview} tone="amber" icon={Clock} />
        <StatCard label="In Progress" value={loading ? '-' : inProgress} tone="purple" icon={Users} />
        <StatCard label="Resolved Today" value={loading ? '-' : resolvedToday} tone="green" icon={CheckCircle2} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        
        {/* Priority Queue */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-semibold text-ink flex items-center gap-2">
              <ShieldAlert size={18} className="text-brand" /> Priority Queue
            </h2>
            <Link to="/officer/complaints" className="text-xs sm:text-sm font-medium text-brand hover:text-brand-light p-1">
              View All
            </Link>
          </div>
          
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-ink-muted text-sm">Loading queue...</div>
            ) : priorityQueue.length === 0 ? (
              <div className="p-12 flex flex-col items-center justify-center text-center">
                <CheckCircle size={40} className="text-success/50 mb-3" />
                <h3 className="text-ink font-medium">Queue is clear</h3>
                <p className="text-sm text-ink-secondary">No active complaints require attention.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {priorityQueue.map(c => (
                  <div key={c.id} className={`p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 hover:bg-surface-hover transition-colors ${
                    c.priority_label === 'Critical' ? 'border-l-4 border-l-danger' :
                    c.priority_label === 'High' ? 'border-l-4 border-l-warning' : ''
                  }`}>
                    <div className="flex items-center gap-2.5 sm:gap-3 flex-1 flex-wrap">
                      <div className="shrink-0">
                        <PriorityBadge priority={c.priority_label} />
                      </div>
                      <div className="font-mono text-xs text-ink-muted shrink-0">#{c.complaint_id || c.id.substring(0, 8)}</div>
                      {c.nyc311_unique_key && (
                        <span className="text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded shrink-0">
                          NYC 311
                        </span>
                      )}
                      <div className="font-medium text-xs sm:text-sm text-ink truncate max-w-[200px] capitalize">{c.category}</div>
                    </div>
                    
                    <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 w-full sm:w-auto pt-2 sm:pt-0 border-t border-border/40 sm:border-t-0">
                      <div className="text-xs text-ink-muted">{formatRelativeTime(c.created_at)}</div>
                      <Button as={Link} to={`/officer/complaints/${c.id}`} variant="outline" size="sm" className="min-h-[44px] sm:min-h-[32px] px-3.5 flex items-center justify-center">
                        View
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* SLA Warnings */}
        <div className="space-y-4">
          <h2 className="text-base sm:text-lg font-semibold text-ink flex items-center gap-2">
            <Clock size={18} className="text-danger" /> SLA Warnings
          </h2>
          
          <div className="bg-card border border-border rounded-xl shadow-sm p-1 max-h-[400px] overflow-y-auto no-scrollbar">
            {loading ? (
              <div className="p-6 text-center text-sm text-ink-muted">Checking SLA...</div>
            ) : slaWarnings.length === 0 ? (
              <div className="p-8 flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-success/10 rounded-full flex items-center justify-center mb-3">
                  <CheckCircle size={24} className="text-success" />
                </div>
                <div className="text-sm font-medium text-ink">All complaints within SLA</div>
                <div className="text-xs text-ink-muted mt-1">No tasks older than 48 hours.</div>
              </div>
            ) : (
              <div className="space-y-1">
                {slaWarnings.map(c => (
                  <Link key={c.id} to={`/officer/complaints/${c.id}`} className="flex items-center justify-between p-3.5 sm:p-3 rounded-lg hover:bg-surface-hover group transition-colors min-h-[48px]">
                    <div>
                      <div className="font-mono text-xs sm:text-sm text-ink font-medium">#{c.complaint_id || c.id.substring(0,8)}</div>
                      <div className="text-xs text-ink-secondary mt-0.5 capitalize">{c.category}</div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        c.hoursElapsed >= 72 ? 'bg-danger text-white animate-pulse' : 'bg-warning/20 text-warning-dark'
                      }`}>
                        {c.hoursElapsed}h elapsed
                      </span>
                      <span className="text-[10px] text-ink-muted group-hover:text-brand transition-colors">
                        Action required &rarr;
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
