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
 * Envia um SMS usando a API HTTP da Brevo.
 *
 * Modos de operação:
 * - Se SMS_MODE=mock: loga no console (para desenvolvimento)
 * - Se BREVO_API_KEY não estiver configurada: loga no console
 * - Caso contrário: envia via Brevo
 */
export async function sendSms(to: string, body: string): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY || process.env.SENDINBLUE_API_KEY;
  const sender = process.env.BREVO_SMS_SENDER || "OggaHub";
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

  if (!apiKey) {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📱 [SMS MOCK] Brevo não configurado:");
    console.log(`   Para: ${normalizedTo}`);
    console.log(`   Mensagem: ${body}`);
    console.log("   💡 Dica: Configure BREVO_API_KEY no .env ou use SMS_MODE=mock");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    return;
  }

  const res = await fetch("https://api.brevo.com/v3/transactionalSMS/sms", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify({
      sender,
      recipient: normalizedTo,
      content: body,
    }),
  });

  if (!res.ok) {
    let text = "";
    try {
      text = await res.text();
    } catch {}

    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.error("❌ Brevo SMS falhou:");
    console.error(`   Status: ${res.status}`);
    if (text) console.error(`   Body: ${text}`);
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    throw new Error("Failed to send SMS");
  }
}

export async function sendWhatsApp(to: string, body: string): Promise<void> {
  const smsMode = process.env.SMS_MODE;
  const normalizedTo = normalizePhoneE164(to);

  if (smsMode === "mock") {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📱 [WHATSAPP MOCK] Notificação de chat (suspenso):");
    console.log(`   Para: whatsapp:${normalizedTo}`);
    console.log(`   Mensagem: ${body}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  }
}
