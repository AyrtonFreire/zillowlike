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
  VISIT_CONFIRMED: "visit-confirmed",
  VISIT_REJECTED_BY_OWNER: "visit-rejected-by-owner",
  // Assistant events
  ASSISTANT_ITEM_UPDATED: "assistant:item_updated",
  ASSISTANT_ITEMS_RECALCULATED: "assistant:items_recalculated",
  // Chat events
  NEW_CHAT_MESSAGE: "new-chat-message",
} as const;

// Canais disponíveis
export const PUSHER_CHANNELS = {
  REALTOR: (realtorId: string) => `private-realtor-${realtorId}`,
  AGENCY: (teamId: string) => `private-agency-${teamId}`,
  // Chat channels (público para clientes que só tem o token)
  CHAT: (leadId: string) => `chat-${leadId}`,
  PRESENCE_CHAT: (leadId: string) => `presence-chat-${leadId}`,
} as const;
