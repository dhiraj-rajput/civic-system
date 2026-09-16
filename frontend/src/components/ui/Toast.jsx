import { createContext, useContext, useState, useCallback } from "react";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";
import { createPortal } from "react-dom";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((type, message) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev.slice(-2), { id, type, message }]);
    setTimeout(() => removeToast(id), 4000);
  }, [removeToast]);

  const toast = {
    success: (msg) => addToast('success', msg),
    error: (msg) => addToast('error', msg),
    info: (msg) => addToast('info', msg),
  };

  return (
    <ToastContext.Provider value={{ toast, dismiss: removeToast }}>
      {children}
      {typeof document !== 'undefined' && createPortal(
        <div className="fixed right-4 top-4 z-[100] flex flex-col gap-2">
          {toasts.map((t) => (
            <div
              key={t.id}
              className="flex w-80 animate-in slide-in-from-right-5 fade-in duration-300 items-start gap-3 rounded-lg border border-border bg-card p-4 shadow-lg"
            >
              <div className="mt-0.5 shrink-0">
                {t.type === 'success' && <CheckCircle size={18} className="text-success" />}
                {t.type === 'error' && <AlertCircle size={18} className="text-danger" />}
                {t.type === 'info' && <Info size={18} className="text-brand" />}
              </div>
              <div className="flex-1 text-sm font-medium text-ink">{t.message}</div>
              <button
                onClick={() => removeToast(t.id)}
                className="shrink-0 rounded p-1 text-ink-muted hover:bg-hover hover:text-ink transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
}
