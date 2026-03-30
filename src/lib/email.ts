/**
 * Email utility functions
 * Configure with your preferred email service (SendGrid, Resend, etc.)
 */

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: EmailOptions) {
  const apiKey = process.env.BREVO_API_KEY || process.env.SENDINBLUE_API_KEY;

  console.log("[EMAIL] Tentando enviar email para:", to);
  console.log("[EMAIL] BREVO_API_KEY presente?", !!apiKey);

  // Se não houver API key configurada, apenas loga (modo desenvolvimento)
  if (!apiKey) {
    console.log("📧 [DEV MOCK] Email (API key ausente):", { to, subject });
    return true;
  }

  const from = process.env.EMAIL_FROM || "OggaHub <no-reply@oggahub.com>";
  console.log("[EMAIL] Enviando de:", from);

  const fromMatch = String(from).match(/^(.*)<([^>]+)>\s*$/);
  const senderName = (fromMatch?.[1] || "OggaHub").trim();
  const senderEmail = (fromMatch?.[2] || from).trim();

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify({
        sender: {
          name: senderName,
          email: senderEmail,
        },
        to: [{ email: to }],
        subject,
        htmlContent: html,
      }),
    });

    console.log("[EMAIL] Response status:", response.status);

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      console.error("[EMAIL ERROR] Brevo API retornou erro:", {
        status: response.status,
        statusText: response.statusText,
        body: text,
      });
      return false;
    }

    const data = await response.json().catch(() => null);
    console.log("[EMAIL] ✅ Email enviado com sucesso via Brevo:", data);
    return true;
  } catch (error) {
    console.error("[EMAIL ERROR] Exceção ao chamar Brevo:", error);
    return false;
  }
}

export * from "./email-templates";
