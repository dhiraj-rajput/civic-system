import React, { useState } from "react";
import { CheckCircle, X, Upload, Loader2, Image as ImageIcon } from "lucide-react";
import { api } from "@/api/client";
import { useToast } from "@/components/ui/Toast";
import Button from "@/components/ui/Button";

export default function ResolutionEvidenceModal({
  complaintId,
  isOpen,
  onClose,
  onResolved,
}) {
  const { toast } = useToast();
  const [beforeUrl, setBeforeUrl] = useState("");
  const [afterUrl, setAfterUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingBefore, setUploadingBefore] = useState(false);
  const [uploadingAfter, setUploadingAfter] = useState(false);

  if (!isOpen) return null;

  const handleFileUpload = async (file, type) => {
    if (!file) return;
    const isBefore = type === "before";
    if (isBefore) setUploadingBefore(true);
    else setUploadingAfter(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.upload("/upload", formData);
      if (res && res.url) {
        if (isBefore) setBeforeUrl(res.url);
        else setAfterUrl(res.url);
        toast.success(`${isBefore ? "Before" : "After"} photo uploaded`);
      }
    } catch (err) {
      toast.error(err.detail || "Failed to upload evidence photo");
    } finally {
      if (isBefore) setUploadingBefore(false);
      else setUploadingAfter(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!notes.trim()) {
      toast.error("Please provide resolution notes describing the repair.");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post(`/complaints/${complaintId}/resolve`, {
        before_image_url: beforeUrl || null,
        after_image_url: afterUrl || null,
        notes: notes.trim(),
      });
      toast.success("Complaint resolved with evidence submitted!");
      onResolved();
      onClose();
    } catch (err) {
      toast.error(err.detail || "Failed to submit resolution evidence");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-2xl space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-2 text-ink">
            <CheckCircle size={20} className="text-success" />
            <h3 className="text-base font-bold">Submit Resolution Evidence</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink-muted hover:bg-surface-hover hover:text-ink"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Photos: Before & After */}
          <div className="grid grid-cols-2 gap-4">
            {/* Before Photo */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink-secondary">Before Photo</label>
              {beforeUrl ? (
                <div className="relative h-28 overflow-hidden rounded-lg border border-border">
                  <img src={beforeUrl} alt="Before repair" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setBeforeUrl("")}
                    className="absolute top-1 right-1 rounded-full bg-black/70 p-1 text-white hover:bg-red-600"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <label className="flex h-28 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border hover:border-brand hover:bg-surface-hover transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e.target.files?.[0], "before")}
                    disabled={uploadingBefore}
                  />
                  {uploadingBefore ? (
                    <Loader2 size={18} className="animate-spin text-brand" />
                  ) : (
                    <>
                      <ImageIcon size={18} className="text-ink-muted mb-1" />
                      <span className="text-[11px] text-ink-muted">Upload Before</span>
                    </>
                  )}
                </label>
              )}
            </div>

            {/* After Photo */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink-secondary">After Photo (Proof)</label>
              {afterUrl ? (
                <div className="relative h-28 overflow-hidden rounded-lg border border-border">
                  <img src={afterUrl} alt="After repair" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setAfterUrl("")}
                    className="absolute top-1 right-1 rounded-full bg-black/70 p-1 text-white hover:bg-red-600"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <label className="flex h-28 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border hover:border-brand hover:bg-surface-hover transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e.target.files?.[0], "after")}
                    disabled={uploadingAfter}
                  />
                  {uploadingAfter ? (
                    <Loader2 size={18} className="animate-spin text-brand" />
                  ) : (
                    <>
                      <ImageIcon size={18} className="text-ink-muted mb-1" />
                      <span className="text-[11px] text-ink-muted">Upload After</span>
                    </>
                  )}
                </label>
              )}
            </div>
          </div>

          {/* Resolution Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-ink-secondary">
              Resolution Notes <span className="text-danger">*</span>
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Describe repair actions taken, materials used, inspection results..."
              className="w-full rounded-md border border-border bg-surface-input px-3 py-2 text-xs text-ink focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
              Confirm Resolution
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
