import React, { useState } from "react";
import { CheckCircle2, RotateCcw, AlertCircle, ShieldCheck, Image as ImageIcon } from "lucide-react";
import { api } from "@/api/client";
import { useToast } from "@/components/ui/Toast";
import Button from "@/components/ui/Button";
import StarRating from "@/components/StarRating";
import MediaGallery from "@/components/MediaGallery";

const isVideo = (url) => {
  if (!url) return false;
  return url.endsWith(".mp4") || url.endsWith(".webm") || url.endsWith(".mov") || url.includes("video");
};

export default function CitizenVerificationCard({
  complaint,
  onVerificationComplete,
}) {
  const { toast } = useToast();
  const [showFeedbackInput, setShowFeedbackInput] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [rating, setRating] = useState(5);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Only render if complaint is Resolved and has not been verified yet
  if (complaint.status !== "Resolved") {
    return null;
  }

  const evidence = complaint.resolution_evidence;

  const handleVerify = async (response) => {
    if (response === "no" && !showFeedbackInput) {
      setShowFeedbackInput(true);
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post(`/complaints/${complaint.id}/verify`, {
        response,
        rating: response === "yes" ? rating : null,
        feedback: response === "no" ? feedback.trim() : null,
      });

      if (response === "yes") {
        toast.success(`Thank you! Resolution confirmed with ${rating} stars.`);
      } else {
        toast.info("Complaint reopened and returned to the officer work queue.");
      }
      onVerificationComplete();
    } catch (err) {
      toast.error(err.detail || "Failed to submit verification response");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl border-2 border-brand/40 bg-brand/5 p-5 space-y-4 shadow-sm animate-in fade-in">
      <div className="flex items-center gap-2">
        <ShieldCheck size={20} className="text-brand" />
        <h4 className="text-sm font-bold text-ink">Citizen Resolution Verification</h4>
      </div>

      <p className="text-xs text-ink-secondary leading-relaxed">
        The municipal department has reported this issue as <strong>Resolved</strong>. Please review the officer's resolution notes and evidence below to confirm if the work was completed satisfactorily.
      </p>

      {/* Resolution Proof Photos & Notes */}
      {evidence && (
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <div className="text-xs font-semibold text-ink-muted">Resolution Details:</div>
          {evidence.notes && (
            <p className="text-xs text-ink italic bg-surface-muted p-2 rounded border border-border">
              "{evidence.notes}" — <span className="font-semibold">{evidence.resolved_by || "Officer"}</span>
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {evidence.before_image_url && (
              <div>
                <span className="text-[11px] font-bold text-ink-muted block mb-1 uppercase tracking-wide">Before Repair:</span>
                {isVideo(evidence.before_image_url) ? (
                  <video
                    src={evidence.before_image_url}
                    controls
                    className="h-44 sm:h-36 w-full object-cover rounded-lg border border-border shadow-sm bg-black"
                  />
                ) : (
                  <img
                    src={evidence.before_image_url}
                    alt="Before repair"
                    className="h-44 sm:h-36 w-full object-cover rounded-lg border border-border shadow-sm"
                  />
                )}
              </div>
            )}
            {evidence.after_image_url && (
              <div>
                <span className="text-[11px] font-bold text-success block mb-1 uppercase tracking-wide">After Repair (Resolution Proof):</span>
                {isVideo(evidence.after_image_url) ? (
                  <video
                    src={evidence.after_image_url}
                    controls
                    className="h-44 sm:h-36 w-full object-cover rounded-lg border border-border shadow-sm bg-black"
                  />
                ) : (
                  <img
                    src={evidence.after_image_url}
                    alt="After repair proof"
                    className="h-44 sm:h-36 w-full object-cover rounded-lg border border-border shadow-sm"
                  />
                )}
              </div>
            )}
          </div>

          {evidence.media_urls && evidence.media_urls.length > 0 && (
            <div className="pt-2 border-t border-border/50">
              <MediaGallery mediaUrls={evidence.media_urls} title="Additional Officer Evidence" />
            </div>
          )}
        </div>
      )}

      {/* Verification Prompt */}
      <div className="border-t border-brand/20 pt-4 space-y-4">
        <div className="text-sm font-semibold text-ink text-center">
          Is this issue actually fixed?
        </div>

        <div className="flex flex-col items-center justify-center gap-2 p-3 rounded-lg bg-surface-input border border-border/60">
          <span className="text-xs font-semibold text-ink-secondary text-center">
            Rate the quality of the municipal resolution:
          </span>
          <StarRating value={rating} onChange={setRating} size={24} />
        </div>

        {showFeedbackInput && (
          <div className="space-y-1.5 animate-in fade-in">
            <label className="text-xs font-medium text-ink-secondary">
              Please explain why the issue is not fixed:
            </label>
            <textarea
              rows={3}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="e.g., Pothole was only partially filled, still bumpy for cars..."
              className="w-full min-h-[44px] rounded-md border border-border bg-surface-input p-3 text-xs sm:text-sm text-ink focus:border-brand focus:outline-none"
            />
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={isSubmitting}
            onClick={() => handleVerify("yes")}
            className="min-h-[44px] flex-1 sm:flex-initial sm:px-6 bg-success hover:bg-success/90 text-white font-semibold flex items-center justify-center gap-1.5"
          >
            <CheckCircle2 size={16} /> Yes, Close Case
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isSubmitting}
            onClick={() => handleVerify("no")}
            className="min-h-[44px] flex-1 sm:flex-initial sm:px-6 border-danger text-danger hover:bg-danger/10 font-semibold flex items-center justify-center gap-1.5"
          >
            <RotateCcw size={16} /> {showFeedbackInput ? "Confirm Reopen" : "No, Reopen Issue"}
          </Button>
        </div>
      </div>
    </div>
  );
}
