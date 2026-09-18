import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, File as FileIcon, Trash2, CheckCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function FileUpload({ onFilesSelected, maxFiles = 5 }) {
  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef(null);

  const handleFiles = (fileList) => {
    const newFiles = Array.from(fileList).map((file) => ({
      id: `${URL.createObjectURL(file)}-${Date.now()}`,
      preview: URL.createObjectURL(file),
      progress: 0,
      name: file.name,
      size: file.size,
      type: file.type,
      file,
    }));
    const updated = [...files, ...newFiles].slice(0, maxFiles);
    setFiles(updated);
    newFiles.forEach((f) => simulateUpload(f.id));
    if (onFilesSelected) {
      onFilesSelected(updated.map(u => u.file));
    }
  };

  const simulateUpload = (id) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 25;
      setFiles((prev) =>
        prev.map((f) =>
          f.id === id ? { ...f, progress: Math.min(progress, 100) } : f
        )
      );
      if (progress >= 100) {
        clearInterval(interval);
      }
    }, 200);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const onDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => setIsDragging(false);

  const removeFile = (id) => {
    const updated = files.filter(f => f.id !== id);
    setFiles(updated);
    if (onFilesSelected) {
      onFilesSelected(updated.map(u => u.file));
    }
  };

  return (
    <div className="w-full mx-auto space-y-4">
      <motion.div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        animate={{
          borderColor: isDragging ? "var(--brand-primary, #3b82f6)" : "var(--border-default, #374151)",
          scale: isDragging ? 1.01 : 1,
        }}
        className={cn(
          "relative rounded-xl p-8 text-center cursor-pointer border border-dashed transition-all",
          "bg-[var(--surface-muted)]/30 hover:bg-[var(--surface-muted)]/50",
          isDragging && "ring-2 ring-blue-500/40 border-blue-500"
        )}
      >
        <div className="flex flex-col items-center gap-3">
          <UploadCloud className={cn("w-12 h-12 text-ink-muted group-hover:text-brand transition-colors", isDragging && "text-brand")} />
          <div>
            <h4 className="font-semibold text-sm text-ink">
              {isDragging ? "Drop files here" : "Upload complaint evidence"}
            </h4>
            <p className="text-xs text-ink-muted mt-1">
              Drag & drop photos or videos, or <span className="text-brand font-medium">browse local files</span>
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            multiple
            hidden
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
            accept="image/*,video/*"
          />
        </div>
      </motion.div>

      {/* File Previews */}
      <AnimatePresence>
        {files.length > 0 && (
          <div className="space-y-2">
            {files.map((f) => (
              <motion.div
                key={f.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center justify-between p-3 rounded-lg border border-border bg-card text-xs"
              >
                <div className="flex items-center gap-3 truncate">
                  {f.type.startsWith("image/") ? (
                    <img src={f.preview} alt={f.name} className="w-10 h-10 rounded object-cover border border-border" />
                  ) : (
                    <FileIcon size={20} className="text-ink-muted shrink-0" />
                  )}
                  <div className="truncate">
                    <p className="font-medium text-ink truncate">{f.name}</p>
                    <p className="text-ink-muted text-[11px]">{(f.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {f.progress < 100 ? (
                    <span className="flex items-center gap-1 text-ink-muted">
                      <Loader2 size={14} className="animate-spin text-brand" /> {Math.round(f.progress)}%
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-success">
                      <CheckCircle size={14} /> Ready
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); removeFile(f.id); }}
                    className="p-1 hover:text-danger text-ink-muted transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
