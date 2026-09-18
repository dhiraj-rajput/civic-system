import React, { useState, useEffect, useMemo } from 'react';
import { Search, ChevronDown, ChevronUp, MessageSquare, Send, MapPin } from 'lucide-react';
import { api } from '@/api/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import Button from '@/components/ui/Button';
import { StatusBadge, PriorityBadge } from '@/components/Badges';
import StatusStepper from '@/components/StatusStepper';
import HistoryTimeline from '@/components/HistoryTimeline';
import MediaGallery from '@/components/MediaGallery';
import PriorityExplainer from '@/components/PriorityExplainer';
import CitizenVerificationCard from '@/components/CitizenVerificationCard';
import ComplaintMap from '@/components/ComplaintMap';

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

function ComplaintCard({ complaint, isExpanded, onToggle, onRefresh }) {
  const { toast } = useToast();
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    
    setIsSubmitting(true);
    try {
      await api.post(`/complaints/${complaint.id}/comments`, { text: commentText });
      toast.success('Comment added');
      setCommentText('');
      onRefresh();
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
        <div className="flex items-center gap-3">
          <div className="font-mono text-sm text-ink bg-surface-muted px-2.5 py-1 rounded border border-border shrink-0">
            #{complaint.complaint_id || complaint.id.substring(0, 8)}
          </div>
          {complaint.nyc311_unique_key && (
            <span className="text-[11px] font-semibold bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-amber-400 border border-slate-200 dark:border-zinc-700 px-2 py-0.5 rounded-full hidden sm:inline">
              NYC 311
            </span>
          )}
          <div className="font-medium text-ink capitalize">{complaint.category}</div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <PriorityBadge priority={complaint.priority_label} />
          <StatusBadge status={complaint.status} />
          <div className="text-sm text-ink-muted w-24 text-right hidden sm:block">{formattedDate}</div>
          <div className="text-ink-muted ml-2">
            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-border bg-surface-muted/30 p-5 sm:p-6 space-y-6 animate-in slide-in-from-top-2 fade-in duration-200">
          
          {/* Priority explanation bar */}
          <div className="flex items-center justify-between bg-card p-3 rounded-lg border border-border text-xs">
            <div className="flex items-center gap-2">
              <span className="text-ink-muted font-medium">Priority Score:</span>
              <span className="font-mono font-bold text-ink">{complaint.priority_score} / 100</span>
              <PriorityBadge priority={complaint.priority_label} />
            </div>
            <PriorityExplainer
              priorityLabel={complaint.priority_label}
              priorityScore={complaint.priority_score}
              breakdown={complaint.priority_breakdown}
              escalationHistory={complaint.escalation_history}
            />
          </div>

          {/* NYC 311 Source Information */}
          {(complaint.nyc311_unique_key || complaint.agency || complaint.descriptor) && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-4 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-900 dark:text-white">
                <span>🗽 Official NYC 311 Incident Feed</span>
                <span className="font-mono bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">Case #{complaint.nyc311_unique_key || complaint.complaint_id}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300">
                <div><strong className="text-slate-900 dark:text-white">Agency:</strong> {complaint.agency} {complaint.agency_name ? `(${complaint.agency_name})` : ''}</div>
                <div><strong className="text-slate-900 dark:text-white">Borough:</strong> {complaint.borough || 'New York City'} {complaint.incident_zip ? `(${complaint.incident_zip})` : ''}</div>
                {complaint.descriptor && (
                  <div className="sm:col-span-2"><strong className="text-slate-900 dark:text-white">Issue Descriptor:</strong> {complaint.descriptor}</div>
                )}
              </div>
              {complaint.resolution_description && (
                <div className="bg-white dark:bg-slate-800 p-2.5 rounded border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 mt-1">
                  <strong className="text-slate-900 dark:text-white">Municipal Action Notice:</strong> {complaint.resolution_description}
                </div>
              )}
            </div>
          )}

          {/* Citizen Verification Prompt (Batch 3) */}
          <CitizenVerificationCard
            complaint={complaint}
            onVerificationComplete={onRefresh}
          />

          {/* Description & Address */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Description</h4>
            <p className="text-sm text-ink-secondary whitespace-pre-wrap">{complaint.description}</p>
            <div className="text-xs text-ink-muted mt-2 flex items-center gap-1.5">
              <MapPin size={13} className="text-brand" /> {complaint.address_text || 'No address provided'}
            </div>
          </div>

          {/* Attached Media */}
          {complaint.media_urls && complaint.media_urls.length > 0 && (
            <MediaGallery mediaUrls={complaint.media_urls} title="Attached Photos & Videos" />
          )}

          {/* Map Location */}
          {complaint.location && (
            <div className="space-y-1.5">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Incident Map Pin</h4>
              <ComplaintMap
                mode="single"
                lat={complaint.location.lat}
                lng={complaint.location.lng}
                zoom={15}
                style={{ height: "200px", width: "100%" }}
              />
            </div>
          )}

          {/* Progress Stepper */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Lifecycle Progress</h4>
            <div className="bg-card p-5 rounded-lg border border-border shadow-sm">
              <StatusStepper currentStatus={complaint.status} />
            </div>
          </div>

          {/* Timeline & Comments Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Audit Timeline</h4>
              <div className="bg-card p-4 rounded-lg border border-border shadow-sm max-h-[350px] overflow-y-auto">
                <HistoryTimeline history={complaint.history} />
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-muted flex items-center gap-2">
                <MessageSquare size={14} /> Official Comments & Updates
              </h4>
              <div className="bg-card rounded-lg border border-border shadow-sm flex flex-col h-full max-h-[350px]">
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {!complaint.comments || complaint.comments.length === 0 ? (
                    <div className="text-xs text-ink-muted text-center py-8">No comments yet.</div>
                  ) : (
                    complaint.comments.map((c, i) => (
                      <div key={i} className="flex flex-col gap-1 text-xs">
                        <div className="flex items-baseline justify-between">
                          <span className="font-semibold text-ink capitalize">
                            {c.author_name} <span className="font-normal text-ink-muted">({c.author_role})</span>
                          </span>
                          <span className="text-[10px] text-ink-muted">
                            {new Date(c.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="text-ink-secondary bg-surface-muted p-2 rounded border border-border">
                          {c.text}
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
                    placeholder="Add a comment or follow-up note..."
                    className="flex-1 rounded-md border border-border bg-card px-3 py-1.5 text-xs focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                  />
                  <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting} disabled={!commentText.trim()}>
                    <Send size={13} />
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
  const { toast } = useToast();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

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
    if (!debouncedSearch) return complaints;
    const term = debouncedSearch.toLowerCase();
    return complaints.filter(
      (c) =>
        c.complaint_id?.toLowerCase().includes(term) ||
        c.category?.toLowerCase().includes(term) ||
        c.description?.toLowerCase().includes(term) ||
        c.status?.toLowerCase().includes(term)
    );
  }, [complaints, debouncedSearch]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="font-serif text-2xl font-bold text-ink">My Reported Issues</h1>
          <p className="text-xs text-ink-muted mt-1">Track case progress, view resolution evidence, and verify repairs.</p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search my reports..."
            className="w-full rounded-md border border-border bg-card pl-9 pr-3 py-1.5 text-xs focus:border-brand focus:outline-none"
          />
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-20 bg-card border border-border rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filteredComplaints.length === 0 ? (
        <div className="text-center py-16 bg-card border border-border rounded-xl space-y-3">
          <p className="text-sm text-ink-secondary">No complaints found.</p>
          <Button as="a" href="/citizen/submit" variant="primary" size="sm">
            Report an Issue
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredComplaints.map((comp) => (
            <ComplaintCard
              key={comp.id}
              complaint={comp}
              isExpanded={expandedId === comp.id}
              onToggle={() => setExpandedId(expandedId === comp.id ? null : comp.id)}
              onRefresh={fetchComplaints}
            />
          ))}
        </div>
      )}
    </div>
  );
}
