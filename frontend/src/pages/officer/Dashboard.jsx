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
      .filter(c => c.status !== 'Resolved')
      .sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0))
      .slice(0, 5);
  }, [complaints]);

  // SLA Warnings (created > 48h ago, not resolved)
  const slaWarnings = useMemo(() => {
    const now = new Date();
    return complaints.filter(c => {
      if (c.status === 'Resolved') return false;
      const created = new Date(c.created_at);
      const hoursElapsed = (now - created) / (1000 * 60 * 60);
      return hoursElapsed > 48;
    }).map(c => {
      const hoursElapsed = Math.floor((now - new Date(c.created_at)) / (1000 * 60 * 60));
      return { ...c, hoursElapsed };
    }).sort((a, b) => b.hoursElapsed - a.hoursElapsed);
  }, [complaints]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-8 animate-in fade-in duration-500">
      
      {/* Department Banner */}
      <div className="bg-brand text-white rounded-xl p-6 shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-10 pointer-events-none transform translate-x-1/4 -translate-y-1/4">
          <Building2 size={200} />
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/20 shadow-sm">
              <Building2 size={28} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{user?.department || 'City Services'} Department</h1>
              <p className="text-brand-light mt-1 text-sm flex items-center gap-2">
                <Users size={14} /> Officer: {user?.name}
              </p>
            </div>
          </div>
          
          <Button as={Link} to="/officer/complaints" variant="outline" className="border-white/30 text-white hover:bg-white/10 hover:border-white/50">
            Go to Work Queue <ArrowRight size={16} />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Assigned to Dept" value={loading ? '-' : assigned} tone="blue" icon={AlertTriangle} />
        <StatCard label="Pending Review" value={loading ? '-' : pendingReview} tone="amber" icon={Clock} />
        <StatCard label="In Progress" value={loading ? '-' : inProgress} tone="purple" icon={Users} />
        <StatCard label="Resolved Today" value={loading ? '-' : resolvedToday} tone="green" icon={CheckCircle2} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Priority Queue */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-ink flex items-center gap-2">
              <ShieldAlert size={18} className="text-brand" /> Priority Queue
            </h2>
            <Link to="/officer/complaints" className="text-sm font-medium text-brand hover:text-brand-light">
              View All
            </Link>
          </div>
          
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-ink-muted">Loading queue...</div>
            ) : priorityQueue.length === 0 ? (
              <div className="p-12 flex flex-col items-center justify-center text-center">
                <CheckCircle size={40} className="text-success/50 mb-3" />
                <h3 className="text-ink font-medium">Queue is clear</h3>
                <p className="text-sm text-ink-secondary">No active complaints require attention.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {priorityQueue.map(c => (
                  <div key={c.id} className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-surface-hover transition-colors ${
                    c.priority === 'Critical' ? 'border-l-4 border-l-danger' :
                    c.priority === 'High' ? 'border-l-4 border-l-warning' : ''
                  }`}>
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-24">
                        <PriorityBadge priority={c.priority} />
                      </div>
                      <div className="font-mono text-xs text-ink-muted shrink-0">#{c.id.substring(0, 8)}</div>
                      <div className="font-medium text-ink truncate max-w-[200px]">{c.category}</div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-xs text-ink-muted">{formatRelativeTime(c.created_at)}</div>
                      <Button as={Link} to={`/officer/complaints?id=${c.id}`} variant="outline" size="sm">
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
          <h2 className="text-lg font-semibold text-ink flex items-center gap-2">
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
                  <Link key={c.id} to="/officer/complaints" className="flex items-center justify-between p-3 rounded-lg hover:bg-surface-hover group transition-colors">
                    <div>
                      <div className="font-mono text-sm text-ink font-medium">#{c.id.substring(0,8)}</div>
                      <div className="text-xs text-ink-secondary mt-0.5">{c.category}</div>
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
