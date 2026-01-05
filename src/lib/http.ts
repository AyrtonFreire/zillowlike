export type ApiError = { status: number; message: string; details?: any };

function newId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export async function apiFetch<T = any>(input: RequestInfo | URL, init: RequestInit = {}): Promise<T> {
  const cid = newId();
  try {
    const res = await fetch(input, {
      ...init,
      headers: {
        ...(init.headers || {}),
        "x-correlation-id": cid,
        "Content-Type": (init.headers as any)?.["Content-Type"] || "application/json",
      },
    });
    if (!res.ok) {
      let message = `Erro de rede (${res.status})`;
      try {
        const j = await res.json();
        if (j?.message) message = j.message;
      } catch {}
      const err: ApiError = { status: res.status, message };
      throw err;
    }
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) return (await res.json()) as T;
    return (await res.text()) as unknown as T;
  } catch (e: any) {
    // fire-and-forget client log
    try {
      const isProd = process.env.NODE_ENV === "production";
      const secret = (process.env as any).NEXT_PUBLIC_CLIENT_LOG_SECRET as string | undefined;

      if (!isProd || !!secret) {
        fetch("/api/logs", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(secret ? { "x-client-log-secret": secret } : {}),
          },
          body: JSON.stringify({
            cid,
            at: new Date().toISOString(),
            url: String(input),
            status: e?.status || 0,
            message: e?.message || String(e),
          }),
        });
      }
    } catch {}
    throw e;
  }
}
