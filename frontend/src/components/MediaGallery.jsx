import React, { useState } from "react";
import { Film, Eye, X, Play } from "lucide-react";

export default function MediaGallery({ mediaUrls = [], title = "Attached Evidence" }) {
  const [activeMedia, setActiveMedia] = useState(null);

  if (!mediaUrls || mediaUrls.length === 0) {
    return null;
  }

  const isVideo = (url) => {
    return url.endsWith(".mp4") || url.endsWith(".webm") || url.endsWith(".mov");
  };

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{title}</h4>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {mediaUrls.map((url, idx) => {
          const video = isVideo(url);
          return (
            <div
              key={idx}
              onClick={() => setActiveMedia(url)}
              className="group relative h-28 cursor-pointer overflow-hidden rounded-lg border border-border bg-black/60 shadow-sm transition-all hover:border-brand hover:shadow-md"
            >
              {video ? (
                <div className="relative flex h-full w-full items-center justify-center bg-gray-950 text-white">
                  <video src={url} className="h-full w-full object-cover opacity-60" preload="metadata" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <div className="rounded-full bg-brand p-2 text-white shadow-lg group-hover:scale-110 transition-transform">
                      <Play size={16} fill="white" />
                    </div>
                  </div>
                  <span className="absolute bottom-1 right-2 rounded bg-black/80 px-1.5 py-0.5 text-[10px] font-mono text-gray-300">
                    Video
                  </span>
                </div>
              ) : (
                <div className="h-full w-full relative">
                  <img
                    src={url}
                    alt={`Evidence ${idx + 1}`}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors">
                    <Eye size={18} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Lightbox / Modal */}
      {activeMedia && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setActiveMedia(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-xl bg-black border border-gray-800 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setActiveMedia(null)}
              className="absolute top-3 right-3 z-10 rounded-full bg-black/70 p-2 text-white hover:bg-white hover:text-black transition-colors"
              aria-label="Close"
            >
              <X size={18} />
            </button>

            {isVideo(activeMedia) ? (
              <video
                src={activeMedia}
                controls
                autoPlay
                className="max-h-[80vh] w-full object-contain"
              />
            ) : (
              <img
                src={activeMedia}
                alt="Enlarged Evidence"
                className="max-h-[80vh] w-full object-contain"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
