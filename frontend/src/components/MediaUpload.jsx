import React, { useState, useRef } from "react";
import { Upload, X, Film, Image as ImageIcon, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { api } from "@/api/client";
import { useToast } from "@/components/ui/Toast";

export default function MediaUpload({
  mediaUrls = [],
  onChange = null,
  maxFiles = 4,
  label = "Upload Evidence (Images & Videos)",
  helperText = "Attach photos or video clips (Max: 5MB image, 25MB video)",
}) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (mediaUrls.length + files.length > maxFiles) {
      toast.error(`You can upload a maximum of ${maxFiles} files.`);
      return;
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
        }
      }
      if (onChange) {
        onChange(newUrls);
      }
      toast.success(`${files.length} file(s) uploaded successfully.`);
    } catch (err) {
      toast.error(err.detail || "Failed to upload file. Check file size limits.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemove = (urlToRemove) => {
    const updated = mediaUrls.filter((u) => u !== urlToRemove);
    if (onChange) onChange(updated);
  };

  const isVideo = (url) => {
    return url.endsWith(".mp4") || url.endsWith(".webm") || url.endsWith(".mov");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-ink">{label}</label>
        <span className="text-xs text-ink-muted">
          {mediaUrls.length}/{maxFiles} files
        </span>
      </div>

      {/* Upload Dropzone */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className={`group relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border p-6 transition-all hover:border-brand hover:bg-surface-hover ${
          uploading ? "opacity-60 pointer-events-none" : ""
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
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
          <div className="text-sm font-medium text-ink">
            {uploading ? "Uploading to secure storage..." : "Click or drag images & videos here"}
          </div>
          <div className="text-xs text-ink-muted mt-1">{helperText}</div>
        </div>
      </div>

      {/* Thumbnail previews */}
      {mediaUrls.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          {mediaUrls.map((url, idx) => (
            <div
              key={idx}
              className="group relative h-24 overflow-hidden rounded-lg border border-border bg-black/40 shadow-sm"
            >
              {isVideo(url) ? (
                <div className="flex h-full w-full items-center justify-center bg-gray-950 text-gray-300">
                  <Film size={24} className="text-brand" />
                  <span className="ml-1.5 text-xs font-mono">Video</span>
                </div>
              ) : (
                <img
                  src={url}
                  alt={`Attachment ${idx + 1}`}
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                />
              )}

              <button
                type="button"
                onClick={() => handleRemove(url)}
                className="absolute top-1 right-1 rounded-full bg-black/75 p-1 text-white opacity-80 transition-opacity hover:opacity-100 hover:bg-red-600"
                aria-label="Remove media"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
