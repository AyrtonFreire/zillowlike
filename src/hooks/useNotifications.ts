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

    // Evento: Novo lead reservado para você
    realtorChannel.bind("lead-reserved", (data: any) => {
      addNotification({
        type: "info",
        title: "Novo Lead Reservado!",
        message: `Você tem ${data.timeLimit} minutos para aceitar o lead: ${data.propertyTitle}`,
      });

      // Tocar som de notificação
      playNotificationSound();
    });

    // Evento: Lead aceito com sucesso
    realtorChannel.bind("lead-accepted", (data: any) => {
      addNotification({
        type: "success",
        title: "Lead Aceito!",
        message: `Você aceitou o lead: ${data.propertyTitle}. Score: +${data.pointsEarned}`,
      });
    });

    // Evento: Reserva expirou
    realtorChannel.bind("lead-expired", (data: any) => {
      addNotification({
        type: "warning",
        title: "Reserva Expirada",
        message: `Sua reserva para ${data.propertyTitle} expirou. Score: -8`,
      });
    });

    // Evento: Score atualizado
    realtorChannel.bind("score-updated", (data: any) => {
      addNotification({
        type: "info",
        title: "Score Atualizado",
        message: `${data.action}: ${data.points > 0 ? "+" : ""}${data.points} pontos`,
      });
    });

    // Evento: Posição na fila mudou
    realtorChannel.bind("queue-updated", (data: any) => {
      if (data.positionChange) {
        addNotification({
          type: "info",
          title: "Posição Atualizada",
          message: `Você agora está na posição #${data.newPosition} da fila`,
        });
      }
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
