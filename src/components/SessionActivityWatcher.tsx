"use client";

import { useEffect } from "react";
import { useSession, signOut } from "next-auth/react";

const IDLE_TIMEOUT_MINUTES = 60; // tempo de inatividade antes de deslogar automaticamente

const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  "mousemove",
  "mousedown",
  "keydown",
  "touchstart",
  "scroll",
];

export default function SessionActivityWatcher() {
  const { status } = useSession();

  useEffect(() => {
    if (status !== "authenticated") return;

    let timeoutId: number | null = null;

    const resetTimer = () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        signOut({ callbackUrl: "/auth/signin?reason=inactive" });
      }, IDLE_TIMEOUT_MINUTES * 60 * 1000);
    };

    resetTimer();

    ACTIVITY_EVENTS.forEach((event) =>
      window.addEventListener(event, resetTimer, { passive: true })
    );

    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      ACTIVITY_EVENTS.forEach((event) =>
        window.removeEventListener(event, resetTimer)
      );
    };
  }, [status]);

  return null;
}
