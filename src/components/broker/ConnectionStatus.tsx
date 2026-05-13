"use client";

import { useEffect, useState } from "react";
import { getPusherClient } from "@/lib/pusher-client";

type Status = "connecting" | "connected" | "disconnected" | "error";

export default function ConnectionStatus() {
  const [status, setStatus] = useState<Status>("connecting");

  useEffect(() => {
    let client: any = null;
    try {
      client = getPusherClient();
    } catch {
      return;
    }
    if (!client?.connection) return;

    const current: string | undefined = client.connection.state;
    if (current === "connected") setStatus("connected");
    else if (current === "disconnected" || current === "unavailable" || current === "failed") setStatus("disconnected");
    else if (current === "initialized" || current === "connecting") setStatus("connecting");

    const handler = (states: { current: string }) => {
      const next = states?.current;
      if (next === "connected") setStatus("connected");
      else if (next === "connecting" || next === "initialized") setStatus("connecting");
      else if (next === "unavailable" || next === "failed") setStatus("error");
      else setStatus("disconnected");
    };

    client.connection.bind("state_change", handler);
    return () => {
      try {
        client.connection.unbind("state_change", handler);
      } catch {
        // ignore
      }
    };
  }, []);

  const config = {
    connected: { dot: "bg-emerald-500", pulse: "animate-pulse", label: "Tempo real", tone: "text-emerald-700" },
    connecting: { dot: "bg-amber-400", pulse: "animate-pulse", label: "Conectando…", tone: "text-amber-700" },
    disconnected: { dot: "bg-slate-400", pulse: "", label: "Sem conexão", tone: "text-slate-500" },
    error: { dot: "bg-rose-500", pulse: "", label: "Erro de conexão", tone: "text-rose-700" },
  }[status];

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full bg-white/80 px-2 py-1 text-[10px] font-semibold ${config.tone}`}
      title={`Conexão: ${config.label}`}
    >
      <span className={`inline-block h-2 w-2 rounded-full ${config.dot} ${config.pulse}`} aria-hidden="true" />
      <span className="hidden sm:inline">{config.label}</span>
    </div>
  );
}
