import { decryptSecret } from "@/lib/olx-crypto";

export const OLX_AUTH_URL = "https://auth.olx.com.br/oauth";
export const OLX_TOKEN_URL = "https://auth.olx.com.br/oauth/token";

export const OLX_AUTUPLOAD_IMPORT_URL = "https://apps.olx.com.br/autoupload/import";
export const olxAutouploadImportStatusUrl = (token: string) =>
  `https://apps.olx.com.br/autoupload/import/${encodeURIComponent(token)}`;
export const olxAutouploadAdStatusUrl = (listId: string) =>
  `https://apps.olx.com.br/autoupload/ads/${encodeURIComponent(listId)}`;

export const OLX_AUTOSERVICE_LEAD_URL = "https://apps.olx.com.br/autoservice/v1/lead";
export const olxAutoserviceLeadByIdUrl = (id: string) =>
  `https://apps.olx.com.br/autoservice/v1/lead/${encodeURIComponent(id)}`;

export const OLX_AUTOSERVICE_CHAT_WEBHOOK_URL = "https://apps.olx.com.br/autoservice/v1/chat";
export const OLX_AUTOSERVICE_CHAT_SEND_URL = "https://apps.olx.com.br/autoservice/v1/chat/send";

export const OLX_AUTOSERVICE_NOTIFICATION_URL = "https://apps.olx.com.br/autoservice/v1/notification";
export const olxAutoserviceNotificationByIdUrl = (id: string) =>
  `https://apps.olx.com.br/autoservice/v1/notification/${encodeURIComponent(id)}`;

export function getPublicBaseUrl(): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "";
  const trimmed = String(base).trim();
  if (!trimmed) throw new Error("Missing public base url (NEXT_PUBLIC_APP_URL or NEXTAUTH_URL)");
  return trimmed.replace(/\/+$/, "");
}

export function bearer(token: string) {
  return `Bearer ${token}`;
}

export async function fetchOlxJson<T = any>(
  url: string,
  opts: { method?: string; token?: string; body?: any; headers?: Record<string, string> } = {}
): Promise<{ status: number; data: T }> {
  const method = opts.method || "GET";
  const headers: Record<string, string> = {
    ...(opts.headers || {}),
  };
  if (opts.token) headers.authorization = bearer(opts.token);
  if (opts.body !== undefined) headers["content-type"] = headers["content-type"] || "application/json";

  const res = await fetch(url, {
    method,
    headers,
    body:
      opts.body === undefined
        ? undefined
        : headers["content-type"].includes("application/json")
          ? JSON.stringify(opts.body)
          : opts.body,
  });

  const ct = res.headers.get("content-type") || "";
  const text = await res.text();
  const parsed = ct.includes("application/json") ? (JSON.parse(text || "{}") as T) : ((text as any) as T);

  return { status: res.status, data: parsed };
}

export async function fetchOlxFormToken(args: {
  code: string;
  redirectUri: string;
  clientId: string;
  clientSecret: string;
}): Promise<{ accessToken: string; tokenType: string | null }> {
  const body = new URLSearchParams();
  body.set("code", args.code);
  body.set("client_id", args.clientId);
  body.set("client_secret", args.clientSecret);
  body.set("redirect_uri", args.redirectUri);
  body.set("grant_type", "authorization_code");

  const res = await fetch(OLX_TOKEN_URL, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }

  if (!res.ok) {
    const msg = json?.error || json?.message || text || `Token exchange failed (${res.status})`;
    throw new Error(String(msg));
  }

  const accessToken = String(json?.access_token || "").trim();
  const tokenType = json?.token_type ? String(json.token_type) : null;

  if (!accessToken) throw new Error("Token exchange returned empty access_token");

  return { accessToken, tokenType };
}

export function decryptAccountToken(accessTokenEnc: string): string {
  return decryptSecret(accessTokenEnc);
}
