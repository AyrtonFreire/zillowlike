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
 * 
 * Modos de operação:
 * - Se SMS_MODE=mock: loga no console (para desenvolvimento)
 * - Se variáveis TWILIO_* não estiverem configuradas: loga no console
 * - Caso contrário: envia via Twilio
 */
export async function sendSms(to: string, body: string): Promise<void> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;
  const smsMode = process.env.SMS_MODE; // "mock" para desenvolvimento

  const normalizedTo = normalizePhoneE164(to);

  // Modo mock explícito para desenvolvimento
  if (smsMode === "mock") {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📱 [SMS MOCK] Código de verificação:");
    console.log(`   Para: ${normalizedTo}`);
    console.log(`   Mensagem: ${body}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    return;
  }

  if (!accountSid || !authToken || !fromNumber) {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📱 [SMS MOCK] Twilio não configurado:");
    console.log(`   Para: ${normalizedTo}`);
    console.log(`   Mensagem: ${body}`);
    console.log("   💡 Dica: Configure TWILIO_* no .env ou use SMS_MODE=mock");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
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

    // Parse error for better logging
    let errorCode: number | null = null;
    let errorMessage = "";
    try {
      const errorJson = JSON.parse(text);
      errorCode = errorJson.code;
      errorMessage = errorJson.message;
    } catch {}

    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.error("❌ Twilio SMS falhou:");
    console.error(`   Status: ${res.status}`);
    if (errorCode) console.error(`   Código: ${errorCode}`);
    if (errorMessage) console.error(`   Erro: ${errorMessage}`);
    
    // Dicas específicas por erro
    if (errorCode === 21659) {
      console.error("");
      console.error("   💡 O número em TWILIO_FROM_NUMBER não é um número Twilio válido.");
      console.error("   📋 Soluções:");
      console.error("      1. Compre um número em: https://console.twilio.com/us1/develop/phone-numbers");
      console.error("      2. Ou use SMS_MODE=mock no .env para desenvolvimento");
    }
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    throw new Error("Failed to send SMS");
  }
}

export async function sendWhatsApp(to: string, body: string): Promise<void> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const smsMode = process.env.SMS_MODE;
  const fromWhatsAppEnv = process.env.TWILIO_WHATSAPP_FROM;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;

  const normalizedTo = normalizePhoneE164(to);
  const toWhatsApp = `whatsapp:${normalizedTo}`;

  // Modo mock explícito para desenvolvimento
  if (smsMode === "mock") {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📱 [WHATSAPP MOCK] Notificação de chat:");
    console.log(`   Para: ${toWhatsApp}`);
    console.log(`   Mensagem: ${body}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    return;
  }

  let fromWhatsApp = fromWhatsAppEnv;
  if (!fromWhatsApp && fromNumber) {
    const normalizedFrom = normalizePhoneE164(fromNumber);
    fromWhatsApp = `whatsapp:${normalizedFrom}`;
  }

  if (!accountSid || !authToken || !fromWhatsApp) {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📱 [WHATSAPP MOCK] Twilio WhatsApp não configurado:");
    console.log(`   Para: ${toWhatsApp}`);
    console.log(`   Mensagem: ${body}`);
    console.log("   💡 Dica: Configure TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN e TWILIO_WHATSAPP_FROM (ou TWILIO_FROM_NUMBER) no .env");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    return;
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const params = new URLSearchParams();
  params.append("To", toWhatsApp);
  params.append("From", fromWhatsApp);
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

    let errorCode: number | null = null;
    let errorMessage = "";
    try {
      const errorJson = JSON.parse(text);
      errorCode = errorJson.code;
      errorMessage = errorJson.message;
    } catch {}

    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.error("❌ Twilio WhatsApp falhou:");
    console.error(`   Status: ${res.status}`);
    if (errorCode) console.error(`   Código: ${errorCode}`);
    if (errorMessage) console.error(`   Erro: ${errorMessage}`);
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  }
}
