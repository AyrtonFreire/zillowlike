"use client";

import { useEffect, useState } from "react";
import { getPusherClient } from "@/lib/pusher-client";
import type { Channel } from "pusher-js";

interface Notification {
  id: string;
  type: "success" | "info" | "warning" | "error";
  title: string;
  message: string;
  timestamp: Date;
}

export function useNotifications(realtorId?: string) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [channel, setChannel] = useState<Channel | null>(null);

  useEffect(() => {
    if (!realtorId) return;

    const pusher = getPusherClient();
    const realtorChannel = pusher.subscribe(`private-realtor-${realtorId}`);

    setChannel(realtorChannel);

    // Evento: Visita aprovada pelo proprietário
    realtorChannel.bind("visit-confirmed", (data: any) => {
      addNotification({
        type: "success",
        title: "Visita confirmada",
        message: data?.message || "O proprietário aprovou a visita.",
      });

      playNotificationSound();
    });

    // Evento: Visita recusada pelo proprietário
    realtorChannel.bind("visit-rejected-by-owner", (data: any) => {
      addNotification({
        type: "warning",
        title: "Visita recusada",
        message: data?.message || "O proprietário recusou o horário da visita.",
      });
    });

    return () => {
      realtorChannel.unbind_all();
      pusher.unsubscribe(`private-realtor-${realtorId}`);
    };
  }, [realtorId]);

  const addNotification = (notification: Omit<Notification, "id" | "timestamp">) => {
    const newNotification: Notification = {
      ...notification,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
    };

    setNotifications((prev) => [newNotification, ...prev].slice(0, 10)); // Mantém últimas 10

    // Auto-remove após 5 segundos
    setTimeout(() => {
      removeNotification(newNotification.id);
    }, 5000);
  };

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  return {
    notifications,
    removeNotification,
    clearAll,
  };
}

function playNotificationSound() {
  if (typeof window !== "undefined" && "Audio" in window) {
    try {
      const audio = new Audio("/notification.mp3");
      audio.volume = 0.5;
      audio.play().catch(() => {
        // Ignore errors (user might not have interacted with page yet)
      });
    } catch (error) {
      // Ignore
    }
  }
}
