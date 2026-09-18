import React, { useEffect, useState } from "react";
import { UserCheck, Sparkles, X, Check, MapPin, Briefcase, ChevronRight, AlertCircle, Loader2 } from "lucide-react";
import { api } from "@/api/client";
import { useToast } from "@/components/ui/Toast";
import Button from "@/components/ui/Button";

export default function SmartAssignModal({
  complaint,
  isOpen,
  onClose,
  onAssigned,
}) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [recommendation, setRecommendation] = useState(null);
  const [selectedOfficerId, setSelectedOfficerId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && complaint?.id) {
      loadRecommendation();
    }
  }, [isOpen, complaint?.id]);

  const loadRecommendation = async () => {
    setLoading(true);
    try {
      const data = await api.get(`/complaints/${complaint.id}/assign-recommendation`);
      setRecommendation(data);
      if (data?.recommended_officer) {
        setSelectedOfficerId(data.recommended_officer.officer_id);
      }
    } catch (err) {
      toast.error("Failed to load officer recommendations");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleConfirmAssignment = async () => {
    setSubmitting(true);
    try {
      const chosen = recommendation?.candidates?.find(
        (c) => c.officer_id === selectedOfficerId
      );

      await api.patch(`/complaints/${complaint.id}/assign`, {
        officer_id: selectedOfficerId || null,
        officer_name: chosen?.name || null,
        assigned_to: chosen?.department || recommendation?.department || null,
      });

      toast.success(
        chosen
          ? `Assigned to ${chosen.name} (${chosen.department})`
          : "Complaint assigned successfully"
      );
      onAssigned();
      onClose();
    } catch (err) {
      toast.error(err.detail || "Failed to assign officer");
    } finally {
      setSubmitting(false);
    }
  };

  const best = recommendation?.recommended_officer;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-2 text-ink">
            <Sparkles size={20} className="text-brand" />
            <h3 className="text-base font-bold">Smart Officer Assignment</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink-muted hover:bg-surface-hover hover:text-ink"
          >
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-2">
            <Loader2 size={28} className="animate-spin text-brand" />
            <div className="text-xs text-ink-muted">Evaluating officer workloads & proximity...</div>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Recommendation Highlight */}
            {best ? (
              <div className="rounded-xl border border-brand/40 bg-brand/5 p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 rounded-full bg-brand px-2.5 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                    Recommended Match
                  </span>
                  <span className="font-mono text-xs font-semibold text-brand">
                    Score: {best.score} / 100
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div>
                    <h4 className="text-sm font-bold text-ink">{best.name}</h4>
                    <p className="text-xs text-ink-secondary">{best.department}</p>
                  </div>
                  <div className="text-right text-xs text-ink-muted">
                    <div>📍 {best.distance_km} km away</div>
                    <div>📋 {best.active_workload} active cases</div>
                  </div>
                </div>

                {/* Reasons List */}
                <div className="pt-2 border-t border-brand/20 space-y-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted block">
                    Recommendation Criteria:
                  </span>
                  {recommendation.reasons.map((r, i) => (
                    <div key={i} className="text-xs text-ink-secondary flex items-center gap-1.5">
                      <Check size={12} className="text-brand shrink-0" />
                      <span>{r}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-warning/10 border border-warning/30 text-xs text-warning-dark">
                No active officers currently matched for this department.
              </div>
            )}

            {/* Candidate Selection & Admin Override */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                Available Officers (Select to Override)
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {recommendation?.candidates?.map((cand) => {
                  const isSelected = selectedOfficerId === cand.officer_id;
                  return (
                    <div
                      key={cand.officer_id}
                      onClick={() => setSelectedOfficerId(cand.officer_id)}
                      className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                        isSelected
                          ? "border-brand bg-brand/10 shadow-sm"
                          : "border-border bg-surface-muted/30 hover:bg-surface-hover"
                      }`}
                    >
                      <div>
                        <div className="text-xs font-semibold text-ink flex items-center gap-1.5">
                          {cand.name}
                          {cand.officer_id === best?.officer_id && (
                            <span className="text-[10px] text-brand bg-brand/10 px-1.5 py-0.2 rounded font-normal">
                              Top Pick
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-ink-muted">
                          {cand.active_workload} active · {cand.distance_km} km
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-ink-secondary">
                          {cand.score} pts
                        </span>
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            isSelected ? "border-brand bg-brand text-white" : "border-border"
                          }`}
                        >
                          {isSelected && <Check size={10} />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-border">
              <Button type="button" variant="outline" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                isLoading={submitting}
                disabled={!selectedOfficerId}
                onClick={handleConfirmAssignment}
              >
                <UserCheck size={14} /> Confirm Assignment
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
