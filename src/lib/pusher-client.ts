"use client";

import Pusher from "pusher-js";

let pusherInstance: Pusher | null = null;

export function getPusherClient() {
  if (!pusherInstance) {
    pusherInstance = new Pusher(
      process.env.NEXT_PUBLIC_PUSHER_KEY || "demo-key",
      {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "us2",
        authEndpoint: "/api/pusher/auth",
      }
    );
  }

  return pusherInstance;
}
