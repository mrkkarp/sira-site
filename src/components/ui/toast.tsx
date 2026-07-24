"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";

type ToastTone = "neutral" | "success" | "error";
type ToastItem = { id: string; message: string; tone: ToastTone };

const ToastContext = createContext<{
  show: (message: string, tone?: ToastTone) => void;
} | null>(null);

const toneClass: Record<ToastTone, string> = {
  neutral: "bg-text text-background",
  success: "bg-success text-background",
  error: "bg-error text-background",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const show = useCallback((message: string, tone: ToastTone = "neutral") => {
    const id = `toast-${++counter.current}`;
    setToasts((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 4000);
  }, []);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="fixed bottom-(--space-sm) left-1/2 z-50 flex -translate-x-1/2 flex-col gap-(--space-2xs)"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`type-body-sm px-(--space-sm) py-(--space-2xs) ${toneClass[toast.tone]}`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within a ToastProvider");
  return context;
}
