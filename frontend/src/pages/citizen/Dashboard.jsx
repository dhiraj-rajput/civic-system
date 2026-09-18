import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  FileText, ListChecks, FileWarning, 
  Clock, CheckCircle2, AlertCircle, FilePlus
} from 'lucide-react';
import { api } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import Button from '../../components/ui/Button.jsx';
import StatCard from '../../components/StatCard.jsx';
import { StatusBadge, PriorityBadge } from '../../components/Badges.jsx';

function formatRelativeTime(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  if (diffInSeconds < 60) return 'just now';
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;

  return date.toLocaleDateString();
}

export default function CitizenDashboard() {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get('/complaints/mine')
      .then((data) => setComplaints(data || []))
      .catch((e) => setError(e.detail || 'Could not load complaints'))
      .finally(() => setLoading(false));
  }, []);

  const total = complaints.length;
  const open = complaints.filter((c) => c.status === 'New' || c.status === 'Assigned').length;
  const inProgress = complaints.filter((c) => c.status === 'In Progress').length;
  const resolved = complaints.filter((c) => c.status === 'Resolved').length;

  const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;
  const recentComplaints = [...complaints].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-8 animate-in fade-in duration-500">
      
      {/* Greeting Banner */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-ink">
            {getGreeting()}, {user?.name?.split(' ')[0] || 'Citizen'}
          </h1>
          <p className="text-ink-secondary mt-1">{today}</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Button as={Link} to="/citizen/submit" variant="primary" className="flex-1 md:flex-none py-2.5">
            <FilePlus size={18} /> Submit New Complaint
          </Button>
          <Button as={Link} to="/citizen/complaints" variant="outline" className="flex-1 md:flex-none py-2.5">
            <ListChecks size={18} /> View All
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-danger/10 text-danger p-4 rounded-md border border-danger/20 flex items-center gap-2">
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Filed" value={loading ? '-' : total} tone="blue" icon={FileText} />
        <StatCard label="Open" value={loading ? '-' : open} tone="amber" icon={FileWarning} />
        <StatCard label="In Progress" value={loading ? '-' : inProgress} tone="purple" icon={Clock} />
        <StatCard label="Resolved" value={loading ? '-' : resolved} tone="green" icon={CheckCircle2} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Recent Activity */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="font-serif text-lg font-semibold text-ink">Recent Activity</h2>
          
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-ink-muted">Loading...</div>
            ) : recentComplaints.length > 0 ? (
              <div className="divide-y divide-border">
                {recentComplaints.map((c) => (
                  <Link key={c.id} to={`/citizen/complaints/${c.id}`} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-surface-hover transition-colors gap-4">
                    <div className="flex items-center gap-3">
                      <div className="font-mono text-sm text-ink bg-surface-muted px-2 py-1 rounded border border-border">
                        #{c.complaint_id || c.id.substring(0, 8)}
                      </div>
                      {c.nyc311_unique_key && (
                        <span className="text-[10px] font-semibold bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-amber-400 border border-slate-200 dark:border-zinc-700 px-1.5 py-0.5 rounded">
                          NYC 311
                        </span>
                      )}
                      <div className="font-medium text-ink capitalize">{c.category}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={c.status} />
                      <span className="text-xs text-ink-muted w-24 text-right">
                        {formatRelativeTime(c.created_at)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="p-12 flex flex-col items-center justify-center text-center">
                <div className="w-24 h-24 mb-4 rounded-full bg-brand/5 flex items-center justify-center">
                  <FileText size={40} className="text-brand/40" />
                </div>
                <h3 className="text-lg font-medium text-ink mb-2">No complaints filed yet</h3>
                <p className="text-ink-secondary text-sm mb-6 max-w-sm">
                  You haven't reported any civic issues. If you notice problems like potholes or broken streetlights, let us know!
                </p>
                <Button as={Link} to="/citizen/submit" variant="primary">
                  <FilePlus size={18} /> Submit a Complaint
                </Button>
              </div>
            )}
          </div>
          {total > 5 && (
            <div className="text-center mt-4">
              <Link to="/citizen/complaints" className="text-sm font-medium text-brand hover:text-brand-light transition-colors">
                View all {total} complaints →
              </Link>
            </div>
          )}
        </div>

        {/* Mini Section */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-ink">Your Stats</h2>
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <h3 className="text-sm font-medium text-ink-secondary mb-4">Resolution Rate</h3>
            <div className="flex items-end gap-2 mb-2">
              <span className="text-3xl font-bold text-ink">{resolutionRate}%</span>
              <span className="text-sm text-ink-muted mb-1">resolved</span>
            </div>
            <div className="w-full bg-border rounded-full h-2.5 overflow-hidden">
              <div 
                className="bg-brand h-2.5 rounded-full transition-all duration-1000 ease-out" 
                style={{ width: `${resolutionRate}%` }}
              ></div>
            </div>
            
            <div className="mt-8 pt-6 border-t border-border">
              <h3 className="text-sm font-medium text-ink-secondary mb-4">Quick Tips</h3>
              <ul className="text-sm text-ink space-y-3">
                <li className="flex gap-2">
                  <div className="text-brand flex-shrink-0 mt-0.5">•</div>
                  <span>Include clear photos for faster processing.</span>
                </li>
                <li className="flex gap-2">
                  <div className="text-brand flex-shrink-0 mt-0.5">•</div>
                  <span>Pinpoint the exact location using the map tool.</span>
                </li>
                <li className="flex gap-2">
                  <div className="text-brand flex-shrink-0 mt-0.5">•</div>
                  <span>Check AI suggestions to properly categorize issues.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      
    </div>
  );
}
