import Pusher from "pusher";

// Singleton instance
let pusherInstance: Pusher | null = null;

export function getPusherServer() {
  if (!pusherInstance) {
    pusherInstance = new Pusher({
      appId: process.env.PUSHER_APP_ID || "demo-app-id",
      key: process.env.NEXT_PUBLIC_PUSHER_KEY || "demo-key",
      secret: process.env.PUSHER_SECRET || "demo-secret",
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "us2",
      useTLS: true,
    });
  }

  return pusherInstance;
}

// Eventos disponíveis
export const PUSHER_EVENTS = {
  NEW_LEAD: "new-lead",
  LEAD_RESERVED: "lead-reserved",
  LEAD_ACCEPTED: "lead-accepted",
  LEAD_REJECTED: "lead-rejected",
  LEAD_EXPIRED: "lead-expired",
  QUEUE_UPDATED: "queue-updated",
  SCORE_UPDATED: "score-updated",
  VISIT_CONFIRMED: "visit-confirmed",
  VISIT_REJECTED_BY_OWNER: "visit-rejected-by-owner",
} as const;

// Canais disponíveis
export const PUSHER_CHANNELS = {
  MURAL: "mural",
  REALTOR: (realtorId: string) => `private-realtor-${realtorId}`,
  QUEUE: "queue",
} as const;
