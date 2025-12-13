"use client";

import { useEffect, useState } from "react";

export interface ToastData {
  id: string;
  type: "success" | "error" | "info";
  title: string;
  description?: string;
  duration?: number;
}

interface ToastProps {
  toast: ToastData;
  onDismiss: (id: string) => void;
}

function Toast({ toast, onDismiss }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, toast.duration || 5000);

    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onDismiss]);

  const bgColor = {
    success: "bg-green-50 border-green-200 dark:bg-green-950/80 dark:border-green-800",
    error: "bg-red-50 border-red-200 dark:bg-red-950/80 dark:border-red-800",
    info: "bg-blue-50 border-blue-200 dark:bg-blue-950/80 dark:border-blue-800",
  }[toast.type];

  const textColor = {
    success: "text-green-800 dark:text-green-200",
    error: "text-red-800 dark:text-red-200",
    info: "text-blue-800 dark:text-blue-200",
  }[toast.type];

  const Icon = {
    success: (
      <svg className="h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
    error: (
      <svg className="h-5 w-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
    info: (
      <svg className="h-5 w-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  }[toast.type];

  return (
    <div
      className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border p-4 shadow-lg backdrop-blur-sm ${bgColor}`}
      role="alert"
    >
      <div className="flex-shrink-0">{Icon}</div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${textColor}`}>{toast.title}</p>
        {toast.description && (
          <p className={`mt-1 text-sm opacity-80 ${textColor}`}>{toast.description}</p>
        )}
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className={`flex-shrink-0 rounded p-1 hover:bg-black/5 dark:hover:bg-white/10 ${textColor}`}
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

interface ToastContainerProps {
  toasts: ToastData[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

// Hook for managing toasts
export function useToast() {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const addToast = (toast: Omit<ToastData, "id">) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { ...toast, id }]);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const success = (title: string, description?: string) => {
    addToast({ type: "success", title, description });
  };

  const error = (title: string, description?: string) => {
    addToast({ type: "error", title, description, duration: 8000 });
  };

  const info = (title: string, description?: string) => {
    addToast({ type: "info", title, description });
  };

  return {
    toasts,
    addToast,
    dismissToast,
    success,
    error,
    info,
  };
}

