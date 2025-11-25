"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle, Info, AlertTriangle, XCircle } from "lucide-react";
import ConfirmModal from "@/components/ui/ConfirmModal";

// Toast Types
interface Toast {
  id: string;
  type: "success" | "error" | "warning" | "info";
  title: string;
  message?: string;
  duration?: number;
}

// Confirm Types
interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
}

interface ToastContextType {
  showToast: (toast: Omit<Toast, "id">) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ToastContext = createContext<ToastContextType | null>(null);

const icons = {
  success: CheckCircle,
  info: Info,
  warning: AlertTriangle,
  error: XCircle,
};

const colors = {
  success: {
    bg: "bg-green-50",
    border: "border-green-200",
    icon: "text-green-600",
    title: "text-green-900",
    message: "text-green-700",
    progress: "bg-green-500",
  },
  info: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    icon: "text-blue-600",
    title: "text-blue-900",
    message: "text-blue-700",
    progress: "bg-blue-500",
  },
  warning: {
    bg: "bg-orange-50",
    border: "border-orange-200",
    icon: "text-orange-600",
    title: "text-orange-900",
    message: "text-orange-700",
    progress: "bg-orange-500",
  },
  error: {
    bg: "bg-red-50",
    border: "border-red-200",
    icon: "text-red-600",
    title: "text-red-900",
    message: "text-red-700",
    progress: "bg-red-500",
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    options: ConfirmOptions | null;
    resolve: ((value: boolean) => void) | null;
  }>({
    isOpen: false,
    options: null,
    resolve: null,
  });

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((toast: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).substring(2, 11);
    const duration = toast.duration ?? 4000;

    setToasts((prev) => [...prev, { ...toast, id }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  const success = useCallback((title: string, message?: string) => {
    showToast({ type: "success", title, message });
  }, [showToast]);

  const error = useCallback((title: string, message?: string) => {
    showToast({ type: "error", title, message });
  }, [showToast]);

  const warning = useCallback((title: string, message?: string) => {
    showToast({ type: "warning", title, message });
  }, [showToast]);

  const info = useCallback((title: string, message?: string) => {
    showToast({ type: "info", title, message });
  }, [showToast]);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmState({
        isOpen: true,
        options,
        resolve,
      });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    confirmState.resolve?.(true);
    setConfirmState({ isOpen: false, options: null, resolve: null });
  }, [confirmState.resolve]);

  const handleCancel = useCallback(() => {
    confirmState.resolve?.(false);
    setConfirmState({ isOpen: false, options: null, resolve: null });
  }, [confirmState.resolve]);

  return (
    <ToastContext.Provider value={{ showToast, success, error, warning, info, confirm }}>
      {children}

      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-[50000] space-y-3 max-w-md pointer-events-none">
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => {
            const Icon = icons[toast.type];
            const colorScheme = colors[toast.type];

            return (
              <motion.div
                key={toast.id}
                layout
                initial={{ opacity: 0, x: 50, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 50, scale: 0.9 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className={`${colorScheme.bg} ${colorScheme.border} border rounded-xl shadow-lg overflow-hidden pointer-events-auto`}
              >
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      <Icon className={`w-5 h-5 ${colorScheme.icon}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold ${colorScheme.title} text-sm`}>
                        {toast.title}
                      </p>
                      {toast.message && (
                        <p className={`${colorScheme.message} text-sm mt-1`}>
                          {toast.message}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => removeToast(toast.id)}
                      className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-black/5"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {/* Progress bar */}
                <motion.div
                  initial={{ width: "100%" }}
                  animate={{ width: "0%" }}
                  transition={{ duration: (toast.duration ?? 4000) / 1000, ease: "linear" }}
                  className={`h-1 ${colorScheme.progress}`}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Confirm Modal */}
      {confirmState.options && (
        <ConfirmModal
          isOpen={confirmState.isOpen}
          title={confirmState.options.title}
          message={confirmState.options.message}
          confirmText={confirmState.options.confirmText}
          cancelText={confirmState.options.cancelText}
          variant={confirmState.options.variant}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast deve ser usado dentro de um ToastProvider");
  }
  return context;
}
