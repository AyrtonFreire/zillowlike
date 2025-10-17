"use client";

import { X, CheckCircle, Info, AlertTriangle, XCircle } from "lucide-react";

interface Notification {
  id: string;
  type: "success" | "info" | "warning" | "error";
  title: string;
  message: string;
  timestamp: Date;
}

interface NotificationToastProps {
  notifications: Notification[];
  onRemove: (id: string) => void;
}

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
  },
  info: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    icon: "text-blue-600",
    title: "text-blue-900",
    message: "text-blue-700",
  },
  warning: {
    bg: "bg-orange-50",
    border: "border-orange-200",
    icon: "text-orange-600",
    title: "text-orange-900",
    message: "text-orange-700",
  },
  error: {
    bg: "bg-red-50",
    border: "border-red-200",
    icon: "text-red-600",
    title: "text-red-900",
    message: "text-red-700",
  },
};

export default function NotificationToast({ notifications, onRemove }: NotificationToastProps) {
  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-3 max-w-md">
      {notifications.map((notification) => {
        const Icon = icons[notification.type];
        const colorScheme = colors[notification.type];

        return (
          <div
            key={notification.id}
            className={`${colorScheme.bg} ${colorScheme.border} border rounded-lg shadow-lg p-4 animate-in slide-in-from-right duration-300`}
          >
            <div className="flex items-start gap-3">
              <Icon className={`w-5 h-5 ${colorScheme.icon} flex-shrink-0 mt-0.5`} />
              <div className="flex-1 min-w-0">
                <h4 className={`font-semibold ${colorScheme.title} text-sm mb-1`}>
                  {notification.title}
                </h4>
                <p className={`${colorScheme.message} text-sm`}>
                  {notification.message}
                </p>
              </div>
              <button
                onClick={() => onRemove(notification.id)}
                className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
