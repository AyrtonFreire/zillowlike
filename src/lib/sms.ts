import { Buffer } from "buffer";

function normalizePhoneE164(phone: string): string {
  const trimmed = phone.trim();
  if (!trimmed) return trimmed;

  // Already looks like E.164
  if (trimmed.startsWith("+")) return trimmed;

  const digits = trimmed.replace(/\D+/g, "");
  if (!digits) return trimmed;

  // Heurística simples para Brasil: 10 ou 11 dígitos => prefixa +55
  if (digits.length === 10 || digits.length === 11) {
    return `+55${digits}`;
  }

  // Fallback: prefixa + e usa os dígitos crus
  return `+${digits}`;
}

/**
 * Envia um SMS usando a API HTTP do Twilio.
 * Em desenvolvimento, se as variáveis TWILIO_* não estiverem configuradas,
 * apenas loga no console (modo mock) para não quebrar o fluxo.
 */
export async function sendSms(to: string, body: string): Promise<void> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;

  const normalizedTo = normalizePhoneE164(to);

  if (!accountSid || !authToken || !fromNumber) {
    console.log("\ud83d\udcf1 [SMS MOCK] Twilio env vars missing. SMS not actually sent.", {
      to: normalizedTo,
      body,
    });
    return;
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const params = new URLSearchParams();
  params.append("To", normalizedTo);
  params.append("From", fromNumber);
  params.append("Body", body);

  const authHeader = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${authHeader}`,
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
    },
    body: params.toString(),
  });

  if (!res.ok) {
    let text = "";
    try {
      text = await res.text();
    } catch {}

    console.error("\u274c Twilio SMS send failed", {
      status: res.status,
      body: text,
    });

    throw new Error("Failed to send SMS");
  }
}
