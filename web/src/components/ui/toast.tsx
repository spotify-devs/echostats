"use client";

import { AlertCircle, CheckCircle, Info, X } from "lucide-react";
import { useEffect, useState } from "react";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

let addToastFn: ((type: ToastType, message: string) => void) | null = null;

export function showToast(type: ToastType, message: string) {
  addToastFn?.(type, message);
}

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
};

const colors = {
  success: "border-emerald-500/30 bg-emerald-500/10",
  error: "border-red-500/30 bg-red-500/10",
  info: "border-accent-cyan/30 bg-accent-cyan/10",
};

const iconColors = {
  success: "text-emerald-400",
  error: "text-red-400",
  info: "text-accent-cyan",
};

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    addToastFn = (type: ToastType, message: string) => {
      const id = Math.random().toString(36).slice(2);
      setToasts((prev) => [...prev, { id, type, message }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 5000);
    };
    return () => {
      addToastFn = null;
    };
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-[100] space-y-2 max-w-sm">
      {toasts.map((toast) => {
        const Icon = icons[toast.type];
        return (
          <div
            key={toast.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-lg shadow-glass animate-slide-up ${colors[toast.type]}`}
          >
            <Icon className={`w-5 h-5 flex-shrink-0 ${iconColors[toast.type]}`} />
            <p className="text-sm text-theme flex-1">{toast.message}</p>
            <button
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              className="text-theme-tertiary hover:text-theme-secondary"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
