import React, { useState, useRef } from "react";
import { CheckCircle, X, Upload, Loader2, Image as ImageIcon, Film, Plus, Play } from "lucide-react";
import { api } from "@/api/client";
import { useToast } from "@/components/ui/Toast";
import Button from "@/components/ui/Button";

const isVideo = (url) => {
  if (!url) return false;
  return url.endsWith(".mp4") || url.endsWith(".webm") || url.endsWith(".mov") || url.includes("video");
};

export default function ResolutionEvidenceModal({
  complaintId,
  isOpen,
  onClose,
  onResolved,
}) {
  const { toast } = useToast();
  const [beforeUrl, setBeforeUrl] = useState("");
  const [afterUrl, setAfterUrl] = useState("");
  const [additionalMedia, setAdditionalMedia] = useState([]);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [uploadingBefore, setUploadingBefore] = useState(false);
  const [uploadingAfter, setUploadingAfter] = useState(false);
  const [uploadingAdditional, setUploadingAdditional] = useState(false);

  const additionalInputRef = useRef(null);

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
        toast.success(`${isBefore ? "Before" : "After"} media uploaded`);
      }
    } catch (err) {
      toast.error(err.detail || "Failed to upload evidence file");
    } finally {
      if (isBefore) setUploadingBefore(false);
      else setUploadingAfter(false);
    }
  };

  const handleAdditionalUpload = async (files) => {
    if (!files || !files.length) return;
    setUploadingAdditional(true);
    try {
      const uploaded = [];
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        const res = await api.upload("/upload", formData);
        if (res && res.url) {
          uploaded.push(res.url);
        }
      }
      setAdditionalMedia((prev) => [...prev, ...uploaded]);
      toast.success(`${uploaded.length} additional evidence item(s) attached`);
    } catch (err) {
      toast.error(err.detail || "Failed to upload additional media");
    } finally {
      setUploadingAdditional(false);
      if (additionalInputRef.current) additionalInputRef.current.value = "";
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
        media_urls: additionalMedia,
        notes: notes.trim(),
      });
      toast.success("Complaint resolved with full multi-media evidence submitted!");
      onResolved();
      onClose();
    } catch (err) {
      toast.error(err.detail || "Failed to submit resolution evidence");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderMediaPreview = (url, onRemove, label) => {
    const isVid = isVideo(url);
    return (
      <div className="relative h-32 w-full overflow-hidden rounded-lg border border-border bg-black/40 shadow-sm group">
        {isVid ? (
          <video
            src={url}
            className="h-full w-full object-cover"
            controls
            preload="metadata"
          />
        ) : (
          <img src={url} alt={label || "Evidence"} className="h-full w-full object-cover" />
        )}
        <button
          type="button"
          onClick={onRemove}
          className="absolute top-1.5 right-1.5 z-10 rounded-full bg-black/75 p-1 text-white hover:bg-red-600 transition-colors"
          title="Remove item"
        >
          <X size={13} />
        </button>
        {isVid && (
          <span className="absolute bottom-1 left-1.5 rounded bg-black/80 px-1.5 py-0.5 text-[10px] font-mono text-white pointer-events-none">
            Video
          </span>
        )}
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl rounded-xl border border-border bg-card p-5 sm:p-6 shadow-2xl space-y-5 sm:space-y-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-2 text-ink">
            <CheckCircle size={20} className="text-emerald-500" />
            <h3 className="text-base font-bold">Submit Resolution Evidence</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-ink-muted hover:bg-surface-hover hover:text-ink transition-colors"
            title="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Primary Evidence: Before & After (Photos or Videos) */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-ink uppercase tracking-wider block">
              Before & After Repair Proof (Photos or Videos)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Before Media */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-ink-secondary">Before State (Optional)</label>
                {beforeUrl ? (
                  renderMediaPreview(beforeUrl, () => setBeforeUrl(""), "Before repair")
                ) : (
                  <label className="flex h-32 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border hover:border-amber-400 hover:bg-surface-hover transition-colors p-3 text-center">
                    <input
                      type="file"
                      accept="image/*,video/*"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e.target.files?.[0], "before")}
                      disabled={uploadingBefore}
                    />
                    {uploadingBefore ? (
                      <Loader2 size={20} className="animate-spin text-amber-500" />
                    ) : (
                      <>
                        <div className="flex items-center gap-1 text-ink-muted mb-1">
                          <ImageIcon size={18} />
                          <Film size={18} />
                        </div>
                        <span className="text-xs font-medium text-ink">Upload Before</span>
                        <span className="text-[10px] text-ink-muted">Photo or Video (≤25MB)</span>
                      </>
                    )}
                  </label>
                )}
              </div>

              {/* After Media */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-ink-secondary">After State (Proof) <span className="text-red-400">*</span></label>
                {afterUrl ? (
                  renderMediaPreview(afterUrl, () => setAfterUrl(""), "After repair")
                ) : (
                  <label className="flex h-32 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border hover:border-amber-400 hover:bg-surface-hover transition-colors p-3 text-center">
                    <input
                      type="file"
                      accept="image/*,video/*"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e.target.files?.[0], "after")}
                      disabled={uploadingAfter}
                    />
                    {uploadingAfter ? (
                      <Loader2 size={20} className="animate-spin text-amber-500" />
                    ) : (
                      <>
                        <div className="flex items-center gap-1 text-ink-muted mb-1">
                          <ImageIcon size={18} />
                          <Film size={18} />
                        </div>
                        <span className="text-xs font-medium text-ink">Upload After Proof</span>
                        <span className="text-[10px] text-ink-muted">Photo or Video (≤25MB)</span>
                      </>
                    )}
                  </label>
                )}
              </div>
            </div>
          </div>

          {/* Additional Field Evidence (Multiple Photos & Videos) */}
          <div className="space-y-2 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-ink uppercase tracking-wider block">
                  Additional Field Documentation
                </label>
                <p className="text-[11px] text-ink-muted">
                  Attach multiple supporting photos or video clips from the field.
                </p>
              </div>
              <button
                type="button"
                onClick={() => additionalInputRef.current?.click()}
                disabled={uploadingAdditional}
                className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition-colors"
              >
                {uploadingAdditional ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Plus size={13} />
                )}
                Add Media
              </button>
              <input
                ref={additionalInputRef}
                type="file"
                multiple
                accept="image/*,video/*"
                className="hidden"
                onChange={(e) => handleAdditionalUpload(e.target.files)}
              />
            </div>

            {additionalMedia.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                {additionalMedia.map((url, idx) => (
                  <div key={idx} className="relative h-24">
                    {renderMediaPreview(
                      url,
                      () => setAdditionalMedia(additionalMedia.filter((_, i) => i !== idx)),
                      `Evidence ${idx + 1}`
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Resolution Notes */}
          <div className="space-y-1.5 pt-2 border-t border-border">
            <label className="text-xs font-semibold text-ink-secondary">
              Official Resolution Notes <span className="text-red-400">*</span>
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Describe repair actions taken, materials applied, team lead inspection notes..."
              className="w-full rounded-lg border border-border bg-[var(--surface-input)] px-3 py-2.5 text-xs text-ink focus:border-amber-400 focus:outline-none"
              required
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 pt-3 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={onClose} className="min-h-[44px] sm:min-h-[36px] w-full sm:w-auto justify-center">
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting} className="min-h-[44px] sm:min-h-[36px] w-full sm:w-auto justify-center">
              Confirm Resolution
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
