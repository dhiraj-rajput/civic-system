import React, { useState, useRef } from "react";
import { Upload, X, Film, Image as ImageIcon, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { api } from "@/api/client";
import { useToast } from "@/components/ui/Toast";

export default function MediaUpload({
  mediaUrls = [],
  onChange = null,
  onUploadComplete = null,
  maxFiles = 6,
  label = "Upload Evidence (Images & Videos)",
  helperText = "Attach photos (max 15MB) or video clips (max 50MB, up to 6 files)",
}) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [activePreview, setActivePreview] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (mediaUrls.length + files.length > maxFiles) {
      toast.error(`You can upload a maximum of ${maxFiles} files in total.`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // Pre-flight file size checks
    for (const file of files) {
      const isVid = file.type.startsWith("video/") || file.name.match(/\.(mp4|webm|mov|mkv)$/i);
      const maxSize = isVid ? 50 * 1024 * 1024 : 15 * 1024 * 1024;
      const maxMb = isVid ? 50 : 15;

      if (file.size > maxSize) {
        const fileMb = (file.size / (1024 * 1024)).toFixed(1);
        toast.error(`"${file.name}" is too large (${fileMb}MB). Maximum allowed is ${maxMb}MB.`);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
    }

    setUploading(true);
    const newUrls = [...mediaUrls];

    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);

        const res = await api.upload("/upload", formData);
        if (res && res.url) {
          newUrls.push(res.url);
          if (onUploadComplete) {
            onUploadComplete(res.url);
          }
        }
      }
      if (onChange) {
        onChange(newUrls);
      }
      toast.success(`${files.length} file(s) uploaded successfully.`);
    } catch (err) {
      toast.error(err.detail || "Failed to upload file. Please ensure file is under the size limits.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemove = (urlToRemove, e) => {
    if (e) e.stopPropagation();
    const updated = mediaUrls.filter((u) => u !== urlToRemove);
    if (onChange) onChange(updated);
    if (activePreview === urlToRemove) setActivePreview(null);
    toast.info("Media removed");
  };

  const isVideo = (url) => {
    if (!url) return false;
    return url.endsWith(".mp4") || url.endsWith(".webm") || url.endsWith(".mov") || url.includes("video");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs sm:text-sm font-semibold text-ink">{label}</label>
        <span className="text-[11px] font-mono text-ink-muted">
          {mediaUrls.length}/{maxFiles} attached
        </span>
      </div>

      {/* Upload Dropzone */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className={`group relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border p-6 transition-all hover:border-brand hover:bg-surface-hover ${
          uploading ? "opacity-60 pointer-events-none" : ""
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*"
          className="hidden"
          onChange={handleFileSelect}
        />

        <div className="flex flex-col items-center justify-center text-center">
          {uploading ? (
            <Loader2 size={28} className="animate-spin text-brand mb-2" />
          ) : (
            <div className="mb-2 rounded-full bg-brand/10 p-3 text-brand transition-transform group-hover:scale-110">
              <Upload size={20} />
            </div>
          )}
          <div className="text-xs sm:text-sm font-semibold text-ink">
            {uploading ? "Uploading to secure storage..." : "Click or tap to upload multiple photos & videos"}
          </div>
          <div className="text-[11px] text-ink-muted mt-1">{helperText}</div>
        </div>
      </div>

      {/* Thumbnail previews with discard and preview click */}
      {mediaUrls.length > 0 && (
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-[11px] font-semibold text-ink-muted uppercase tracking-wider">
            <span>Attached Media (Click to preview, ✕ to discard)</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {mediaUrls.map((url, idx) => (
              <div
                key={idx}
                onClick={() => setActivePreview(url)}
                className="group relative h-28 cursor-pointer overflow-hidden rounded-xl border border-border bg-black/60 shadow-sm transition-all hover:border-brand hover:shadow-md"
              >
                {isVideo(url) ? (
                  <div className="relative flex h-full w-full items-center justify-center bg-gray-950 text-gray-200">
                    <video src={url} className="h-full w-full object-cover opacity-60" preload="metadata" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <Film size={26} className="text-amber-400 drop-shadow" />
                    </div>
                    <span className="absolute bottom-1.5 left-2 rounded bg-black/80 px-1.5 py-0.5 text-[10px] font-mono text-gray-200">
                      Video
                    </span>
                  </div>
                ) : (
                  <img
                    src={url}
                    alt={`Attachment ${idx + 1}`}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                )}

                {/* Discard Button */}
                <button
                  type="button"
                  onClick={(e) => handleRemove(url, e)}
                  className="absolute top-1.5 right-1.5 z-10 rounded-full bg-black/80 p-1 text-white shadow transition-all hover:bg-rose-600 hover:scale-110"
                  aria-label="Discard attachment"
                  title="Discard file"
                >
                  <X size={13} strokeWidth={2.5} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Full-Screen Preview Lightbox Modal */}
      {activePreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setActivePreview(null)}
        >
          <div
            className="relative max-w-3xl w-full max-h-[88vh] flex flex-col items-center bg-card border border-border rounded-2xl p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between w-full pb-3 border-b border-border">
              <span className="text-xs font-bold uppercase tracking-wider text-ink">
                {isVideo(activePreview) ? "Video Preview" : "Photo Preview"}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleRemove(activePreview)}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-500/15 text-rose-600 hover:bg-rose-500 hover:text-white transition-colors"
                >
                  Discard File
                </button>
                <button
                  type="button"
                  onClick={() => setActivePreview(null)}
                  className="p-1 rounded-lg hover:bg-hover text-ink-muted hover:text-ink transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="w-full flex-1 flex items-center justify-center overflow-hidden py-3">
              {isVideo(activePreview) ? (
                <video
                  src={activePreview}
                  controls
                  autoPlay
                  className="max-h-[65vh] w-full rounded-xl object-contain bg-black"
                />
              ) : (
                <img
                  src={activePreview}
                  alt="Full size preview"
                  className="max-h-[65vh] w-full rounded-xl object-contain"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
