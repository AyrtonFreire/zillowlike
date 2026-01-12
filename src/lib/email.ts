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

export function getLeadNotificationEmail(data: {
  propertyTitle: string;
  userName: string;
  userEmail: string;
  userPhone?: string;
  message: string;
  propertyUrl: string;
}) {
  return {
    subject: `Novo interesse no imóvel: ${data.propertyTitle}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
            .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
            .label { font-weight: bold; color: #667eea; margin-bottom: 5px; }
            .value { color: #374151; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">🏠 Novo Lead!</h1>
              <p style="margin: 10px 0 0;">Alguém demonstrou interesse no seu imóvel</p>
            </div>
            <div class="content">
              <div class="info-box">
                <div class="label">Imóvel:</div>
                <div class="value">${data.propertyTitle}</div>
              </div>
              
              <div class="info-box">
                <div class="label">Nome:</div>
                <div class="value">${data.userName}</div>
              </div>
              
              <div class="info-box">
                <div class="label">Email:</div>
                <div class="value"><a href="mailto:${data.userEmail}">${data.userEmail}</a></div>
              </div>
              
              ${data.userPhone ? `
                <div class="info-box">
                  <div class="label">Telefone:</div>
                  <div class="value">${data.userPhone}</div>
                </div>
              ` : ''}
              
              <div class="info-box">
                <div class="label">Mensagem:</div>
                <div class="value">${data.message}</div>
              </div>
              
              <center>
                <a href="${data.propertyUrl}" class="button">Ver Imóvel</a>
              </center>
            </div>
            <div class="footer">
              <p>© 2025 OggaHub. Todos os direitos reservados.</p>
              <p>Você está recebendo este email porque um usuário demonstrou interesse em seu imóvel.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  };
}

export function getRecoveryEmailCodeEmail(data: {
  name?: string | null;
  code: string;
}) {
  return {
    subject: "Confirme seu e-mail de recuperação no OggaHub",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 0; padding: 0; background: #020617; color: #e5e7eb; }
            .wrapper { padding: 24px 12px; }
            .container { max-width: 640px; margin: 0 auto; background: radial-gradient(circle at top, rgba(0,255,200,0.06), transparent 55%), #020617; border-radius: 24px; border: 1px solid rgba(15,118,110,0.45); box-shadow: 0 32px 80px rgba(15,23,42,0.9); overflow: hidden; }
            .header { padding: 24px 28px 20px; background: linear-gradient(135deg, #00736E 0%, #021616 100%); border-bottom: 1px solid rgba(15,118,110,0.6); }
            .logo { display: inline-flex; align-items: center; gap: 10px; }
            .logo-badge { width: 32px; height: 32px; border-radius: 999px; background: radial-gradient(circle at 30% 0%, #5ef2d6 0%, #00736E 45%, #021616 100%); display:flex; align-items:center; justify-content:center; box-shadow: 0 0 0 1px rgba(34,211,238,0.35), 0 16px 40px rgba(15,23,42,0.9); color: #fff; font-weight: 600; }
            .logo-text { font-size: 11px; letter-spacing: 0.22em; text-transform: uppercase; color: rgba(226,232,240,0.85); font-weight: 600; }
            .title { margin: 20px 0 4px; font-size: 20px; font-weight: 600; color: #f9fafb; }
            .subtitle { margin: 0; font-size: 13px; color: rgba(226,232,240,0.85); }
            .content { padding: 22px 24px 24px; background: radial-gradient(circle at top, rgba(15,118,110,0.21), transparent 60%); }
            .card { background: rgba(15,23,42,0.88); border-radius: 18px; padding: 18px 18px 20px; border: 1px solid rgba(15,118,110,0.45); box-shadow: 0 18px 38px rgba(15,23,42,0.9); }
            .paragraph { font-size: 13px; line-height: 1.6; color: #e5e7eb; margin: 0 0 10px; }
            .code { font-size: 28px; letter-spacing: 0.2em; font-weight: 700; text-align: center; padding: 16px 12px; border-radius: 14px; background: rgba(15,23,42,0.95); border: 1px solid rgba(45,212,191,0.45); margin: 16px 0 10px; color: #ecfeff; }
            .hint { font-size: 11px; color: #9ca3af; margin-top: 8px; text-align: center; }
            .footer { padding: 18px 24px 22px; border-top: 1px solid rgba(30,64,175,0.15); font-size: 11px; color: #6b7280; }
            .footer strong { color: #e5e7eb; }
          </style>
        </head>
        <body>
          <div class="wrapper">
            <div class="container">
              <div class="header">
                <div class="logo">
                  <div class="logo-badge">O</div>
                  <div class="logo-text">OggaHub</div>
                </div>
                <h1 class="title">Confirmar e-mail de recuperação</h1>
                <p class="subtitle">Use o código abaixo para confirmar seu e-mail de recuperação.</p>
              </div>
              <div class="content">
                <div class="card">
                  <p class="paragraph">Olá${data.name ? `, <strong>${data.name}</strong>` : ""}.</p>
                  <p class="paragraph">Digite o código abaixo na tela de confirmação. Ele expira em <strong>10 minutos</strong>.</p>
                  <div class="code">${data.code}</div>
                  <p class="hint">Se você não solicitou essa ação, ignore este e-mail.</p>
                </div>
              </div>
              <div class="footer">
                <p>Para sua segurança, o <strong>OggaHub</strong> nunca pede sua senha por e-mail.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `,
  };
}

export function getEmailChangeCodeEmail(data: {
  name?: string | null;
  code: string;
}) {
  return {
    subject: "Confirme a alteração do seu e-mail no OggaHub",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 0; padding: 0; background: #020617; color: #e5e7eb; }
            .wrapper { padding: 24px 12px; }
            .container { max-width: 640px; margin: 0 auto; background: radial-gradient(circle at top, rgba(0,255,200,0.06), transparent 55%), #020617; border-radius: 24px; border: 1px solid rgba(15,118,110,0.45); box-shadow: 0 32px 80px rgba(15,23,42,0.9); overflow: hidden; }
            .header { padding: 24px 28px 20px; background: linear-gradient(135deg, #00736E 0%, #021616 100%); border-bottom: 1px solid rgba(15,118,110,0.6); }
            .logo { display: inline-flex; align-items: center; gap: 10px; }
            .logo-badge { width: 32px; height: 32px; border-radius: 999px; background: radial-gradient(circle at 30% 0%, #5ef2d6 0%, #00736E 45%, #021616 100%); display:flex; align-items:center; justify-content:center; box-shadow: 0 0 0 1px rgba(34,211,238,0.35), 0 16px 40px rgba(15,23,42,0.9); color: #fff; font-weight: 600; }
            .logo-text { font-size: 11px; letter-spacing: 0.22em; text-transform: uppercase; color: rgba(226,232,240,0.85); font-weight: 600; }
            .title { margin: 20px 0 4px; font-size: 20px; font-weight: 600; color: #f9fafb; }
            .subtitle { margin: 0; font-size: 13px; color: rgba(226,232,240,0.85); }
            .content { padding: 22px 24px 24px; background: radial-gradient(circle at top, rgba(15,118,110,0.21), transparent 60%); }
            .card { background: rgba(15,23,42,0.88); border-radius: 18px; padding: 18px 18px 20px; border: 1px solid rgba(15,118,110,0.45); box-shadow: 0 18px 38px rgba(15,23,42,0.9); }
            .paragraph { font-size: 13px; line-height: 1.6; color: #e5e7eb; margin: 0 0 10px; }
            .code { font-size: 28px; letter-spacing: 0.2em; font-weight: 700; text-align: center; padding: 16px 12px; border-radius: 14px; background: rgba(15,23,42,0.95); border: 1px solid rgba(45,212,191,0.45); margin: 16px 0 10px; color: #ecfeff; }
            .hint { font-size: 11px; color: #9ca3af; margin-top: 8px; text-align: center; }
            .footer { padding: 18px 24px 22px; border-top: 1px solid rgba(30,64,175,0.15); font-size: 11px; color: #6b7280; }
            .footer strong { color: #e5e7eb; }
          </style>
        </head>
        <body>
          <div class="wrapper">
            <div class="container">
              <div class="header">
                <div class="logo">
                  <div class="logo-badge">O</div>
                  <div class="logo-text">OggaHub</div>
                </div>
                <h1 class="title">Confirmar alteração de e-mail</h1>
                <p class="subtitle">Use o código abaixo para confirmar a troca do seu e-mail.</p>
              </div>
              <div class="content">
                <div class="card">
                  <p class="paragraph">Olá${data.name ? `, <strong>${data.name}</strong>` : ""}.</p>
                  <p class="paragraph">Se você solicitou a alteração do e-mail da sua conta, digite o código abaixo na tela de confirmação. Ele expira em <strong>10 minutos</strong>.</p>
                  <div class="code">${data.code}</div>
                  <p class="hint">Se você não solicitou essa alteração, ignore este e-mail.</p>
                </div>
              </div>
              <div class="footer">
                <p>Para sua segurança, o <strong>OggaHub</strong> nunca pede sua senha por e-mail.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `,
  };
}

export function getRealtorRatingRequestEmail(data: {
  userName?: string | null;
  realtorName: string;
  propertyTitle?: string | null;
  profileUrl: string;
}) {
  const greetingName = data.userName?.trim() ? `, ${data.userName.trim()}` : "";
  const propertyLine = data.propertyTitle?.trim()
    ? `<p style="margin: 10px 0 0; font-size: 13px; color: rgba(226,232,240,0.85);">Imóvel: <strong>${data.propertyTitle}</strong></p>`
    : "";

  return {
    subject: `Avalie seu atendimento com ${data.realtorName}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 0; padding: 0; background: #020617; color: #e5e7eb; }
            .wrapper { padding: 24px 12px; }
            .container { max-width: 640px; margin: 0 auto; background: radial-gradient(circle at top, rgba(0,255,200,0.06), transparent 55%), #020617; border-radius: 24px; border: 1px solid rgba(15,118,110,0.45); box-shadow: 0 32px 80px rgba(15,23,42,0.9); overflow: hidden; }
            .header { padding: 24px 28px 20px; background: linear-gradient(135deg, #00736E 0%, #021616 100%); border-bottom: 1px solid rgba(15,118,110,0.6); }
            .logo { display: inline-flex; align-items: center; gap: 10px; }
            .logo-badge { width: 32px; height: 32px; border-radius: 999px; background: radial-gradient(circle at 30% 0%, #5ef2d6 0%, #00736E 45%, #021616 100%); display:flex; align-items:center; justify-content:center; box-shadow: 0 0 0 1px rgba(34,211,238,0.35), 0 16px 40px rgba(15,23,42,0.9); color: #fff; font-weight: 600; }
            .logo-text { font-size: 11px; letter-spacing: 0.22em; text-transform: uppercase; color: rgba(226,232,240,0.85); font-weight: 600; }
            .title { margin: 18px 0 4px; font-size: 20px; font-weight: 650; color: #f9fafb; }
            .subtitle { margin: 0; font-size: 13px; color: rgba(226,232,240,0.85); line-height: 1.5; }
            .content { padding: 22px 24px 24px; background: radial-gradient(circle at top, rgba(15,118,110,0.21), transparent 60%); }
            .card { background: rgba(15,23,42,0.88); border-radius: 18px; padding: 18px 18px 20px; border: 1px solid rgba(15,118,110,0.45); box-shadow: 0 18px 38px rgba(15,23,42,0.9); }
            .paragraph { font-size: 13px; line-height: 1.6; color: #e5e7eb; margin: 0 0 10px; }
            .button-wrapper { text-align: center; margin: 18px 0 8px; }
            .button { display: inline-block; padding: 11px 28px; border-radius: 999px; background: linear-gradient(135deg, #10b981 0%, #059669 45%, #0f766e 100%); color: #ecfeff; text-decoration: none; font-size: 13px; font-weight: 650; box-shadow: 0 18px 35px rgba(5,150,105,0.65); border: 1px solid rgba(45,212,191,0.85); }
            .hint { font-size: 11px; color: #9ca3af; margin-top: 10px; text-align: center; }
            .footer { padding: 18px 24px 22px; border-top: 1px solid rgba(30,64,175,0.15); font-size: 11px; color: #6b7280; }
            .footer strong { color: #e5e7eb; }
          </style>
        </head>
        <body>
          <div class="wrapper">
            <div class="container">
              <div class="header">
                <div class="logo">
                  <div class="logo-badge">O</div>
                  <div class="logo-text">OggaHub</div>
                </div>
                <h1 class="title">Como foi seu atendimento${greetingName}?</h1>
                <p class="subtitle">Sua avaliação ajuda outros clientes e também melhora a qualidade dos atendimentos.</p>
                ${propertyLine}
              </div>
              <div class="content">
                <div class="card">
                  <p class="paragraph">Você falou com <strong>${data.realtorName}</strong> recentemente. Pode avaliar em 10 segundos:</p>
                  <div class="button-wrapper">
                    <a href="${data.profileUrl}" class="button">Avaliar agora</a>
                  </div>
                  <p class="hint">Se o botão não funcionar, copie e cole este link no navegador:<br />
                    <span style="word-break: break-all; color: #e5e7eb;">${data.profileUrl}</span>
                  </p>
                </div>
              </div>
              <div class="footer">
                <p>Você recebeu este e-mail porque entrou em contato com um profissional pelo <strong>OggaHub</strong>.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `,
  };
}

export function getAuthVerifyEmailEmail(data: {
  name?: string | null;
  verifyUrl: string;
}) {
  return {
    subject: "Confirme seu e-mail no OggaHub",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 0; padding: 0; background: #020617; color: #e5e7eb; }
            .wrapper { padding: 24px 12px; }
            .container { max-width: 640px; margin: 0 auto; background: radial-gradient(circle at top, rgba(0,255,200,0.06), transparent 55%), #020617; border-radius: 24px; border: 1px solid rgba(15,118,110,0.45); box-shadow: 0 32px 80px rgba(15,23,42,0.9); overflow: hidden; }
            .header { padding: 24px 28px 20px; background: linear-gradient(135deg, #00736E 0%, #021616 100%); border-bottom: 1px solid rgba(15,118,110,0.6); }
            .logo { display: inline-flex; align-items: center; gap: 10px; }
            .logo-badge { width: 32px; height: 32px; border-radius: 999px; background: radial-gradient(circle at 30% 0%, #5ef2d6 0%, #00736E 45%, #021616 100%); display:flex; align-items:center; justify-content:center; box-shadow: 0 0 0 1px rgba(34,211,238,0.35), 0 16px 40px rgba(15,23,42,0.9); color: #fff; font-weight: 600; }
            .logo-text { font-size: 11px; letter-spacing: 0.22em; text-transform: uppercase; color: rgba(226,232,240,0.85); font-weight: 600; }
            .title { margin: 20px 0 4px; font-size: 20px; font-weight: 600; color: #f9fafb; }
            .subtitle { margin: 0; font-size: 13px; color: rgba(226,232,240,0.85); }
            .content { padding: 22px 24px 24px; background: radial-gradient(circle at top, rgba(15,118,110,0.21), transparent 60%); }
            .card { background: rgba(15,23,42,0.88); border-radius: 18px; padding: 18px 18px 20px; border: 1px solid rgba(15,118,110,0.45); box-shadow: 0 18px 38px rgba(15,23,42,0.9); }
            .paragraph { font-size: 13px; line-height: 1.6; color: #e5e7eb; margin: 0 0 10px; }
            .button-wrapper { text-align: center; margin: 18px 0 8px; }
            .button { display: inline-block; padding: 11px 28px; border-radius: 999px; background: linear-gradient(135deg, #10b981 0%, #059669 45%, #0f766e 100%); color: #ecfeff; text-decoration: none; font-size: 13px; font-weight: 600; box-shadow: 0 18px 35px rgba(5,150,105,0.65); border: 1px solid rgba(45,212,191,0.85); }
            .hint { font-size: 11px; color: #9ca3af; margin-top: 8px; text-align: center; }
            .footer { padding: 18px 24px 22px; border-top: 1px solid rgba(30,64,175,0.15); font-size: 11px; color: #6b7280; }
            .footer strong { color: #e5e7eb; }
          </style>
        </head>
        <body>
          <div class="wrapper">
            <div class="container">
              <div class="header">
                <div class="logo">
                  <div class="logo-badge">O</div>
                  <div class="logo-text">OggaHub</div>
                </div>
                <h1 class="title">Confirme seu e-mail</h1>
                <p class="subtitle">Só falta um passo para ativar sua conta e liberar todos os recursos da plataforma.</p>
              </div>
              <div class="content">
                <div class="card">
                  <p class="paragraph">Olá${data.name ? `, <strong>${data.name}</strong>` : ""}! 👋</p>
                  <p class="paragraph">Obrigado por se cadastrar no <strong>OggaHub</strong>. Para manter sua conta segura e garantir que este e-mail é realmente seu, precisamos que você confirme o endereço abaixo.</p>
                  <div class="button-wrapper">
                    <a href="${data.verifyUrl}" class="button">Confirmar meu e-mail</a>
                  </div>
                  <p class="hint">Se o botão não funcionar, copie e cole este link no navegador:<br />
                    <span style="word-break: break-all; color: #e5e7eb;">${data.verifyUrl}</span>
                  </p>
                </div>
              </div>
              <div class="footer">
                <p>Você recebeu este e-mail porque se cadastrou no <strong>OggaHub</strong> usando este endereço. Se não foi você, pode simplesmente ignorar esta mensagem.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `,
  };
}

export function getAuthForgotPasswordEmail(data: {
  resetUrl: string;
}) {
  return {
    subject: "Redefinir senha - OggaHub",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 0; padding: 0; background: #020617; color: #e5e7eb; }
            .wrapper { padding: 24px 12px; }
            .container { max-width: 640px; margin: 0 auto; background: radial-gradient(circle at top, rgba(0,255,200,0.06), transparent 55%), #020617; border-radius: 24px; border: 1px solid rgba(15,118,110,0.45); box-shadow: 0 32px 80px rgba(15,23,42,0.9); overflow: hidden; }
            .header { padding: 24px 28px 20px; background: linear-gradient(135deg, #0f172a 0%, #020617 100%); border-bottom: 1px solid rgba(15,23,42,0.9); }
            .logo { display: inline-flex; align-items: center; gap: 10px; }
            .logo-badge { width: 32px; height: 32px; border-radius: 999px; background: radial-gradient(circle at 30% 0%, #5ef2d6 0%, #00736E 45%, #021616 100%); display:flex; align-items:center; justify-content:center; box-shadow: 0 0 0 1px rgba(34,211,238,0.35), 0 16px 40px rgba(15,23,42,0.9); color: #fff; font-weight: 600; }
            .logo-text { font-size: 11px; letter-spacing: 0.22em; text-transform: uppercase; color: rgba(226,232,240,0.85); font-weight: 600; }
            .title { margin: 20px 0 4px; font-size: 20px; font-weight: 600; color: #f9fafb; }
            .subtitle { margin: 0; font-size: 13px; color: rgba(226,232,240,0.85); }
            .content { padding: 22px 24px 24px; background: radial-gradient(circle at top, rgba(15,23,42,0.75), transparent 60%); }
            .card { background: rgba(15,23,42,0.95); border-radius: 18px; padding: 18px 18px 20px; border: 1px solid rgba(31,41,55,0.9); box-shadow: 0 18px 38px rgba(15,23,42,0.9); }
            .paragraph { font-size: 13px; line-height: 1.6; color: #e5e7eb; margin: 0 0 10px; }
            .button-wrapper { text-align: center; margin: 18px 0 8px; }
            .button { display: inline-block; padding: 11px 28px; border-radius: 999px; background: linear-gradient(135deg, #10b981 0%, #059669 45%, #0f766e 100%); color: #ecfeff; text-decoration: none; font-size: 13px; font-weight: 600; box-shadow: 0 18px 35px rgba(5,150,105,0.65); border: 1px solid rgba(45,212,191,0.85); }
            .hint { font-size: 11px; color: #9ca3af; margin-top: 8px; text-align: center; }
            .footer { padding: 18px 24px 22px; border-top: 1px solid rgba(30,64,175,0.15); font-size: 11px; color: #6b7280; }
            .footer strong { color: #e5e7eb; }
          </style>
        </head>
        <body>
          <div class="wrapper">
            <div class="container">
              <div class="header">
                <div class="logo">
                  <div class="logo-badge">O</div>
                  <div class="logo-text">OggaHub</div>
                </div>
                <h1 class="title">Redefinir sua senha</h1>
                <p class="subtitle">Recebemos um pedido para redefinir a senha da sua conta.</p>
              </div>
              <div class="content">
                <div class="card">
                  <p class="paragraph">Clique no botão abaixo para criar uma nova senha. Por segurança, este link expira em <strong>1 hora</strong>.</p>
                  <div class="button-wrapper">
                    <a href="${data.resetUrl}" class="button">Escolher nova senha</a>
                  </div>
                  <p class="hint">Se o botão não funcionar, copie e cole este link no navegador:<br />
                    <span style="word-break: break-all; color: #e5e7eb;">${data.resetUrl}</span>
                  </p>
                  <p class="paragraph" style="margin-top:14px; font-size:11px; color:#9ca3af;">Se você não solicitou esta alteração, pode ignorar este e-mail. Sua senha continuará a mesma.</p>
                </div>
              </div>
              <div class="footer">
                <p>Para manter sua conta segura, nunca compartilhe sua senha com ninguém. O time do <strong>OggaHub</strong> nunca irá pedir sua senha por e-mail ou mensagem.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `,
  };
}

export function getAuthResendVerificationEmail(data: {
  verifyUrl: string;
}) {
  return {
    subject: "Novo link de confirmação - OggaHub",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 0; padding: 0; background: #020617; color: #e5e7eb; }
            .wrapper { padding: 24px 12px; }
            .container { max-width: 640px; margin: 0 auto; background: radial-gradient(circle at top, rgba(0,255,200,0.06), transparent 55%), #020617; border-radius: 24px; border: 1px solid rgba(15,118,110,0.45); box-shadow: 0 32px 80px rgba(15,23,42,0.9); overflow: hidden; }
            .header { padding: 24px 28px 20px; background: linear-gradient(135deg, #00736E 0%, #021616 100%); border-bottom: 1px solid rgba(15,118,110,0.6); }
            .logo { display: inline-flex; align-items: center; gap: 10px; }
            .logo-badge { width: 32px; height: 32px; border-radius: 999px; background: radial-gradient(circle at 30% 0%, #5ef2d6 0%, #00736E 45%, #021616 100%); display:flex; align-items:center; justify-content:center; box-shadow: 0 0 0 1px rgba(34,211,238,0.35), 0 16px 40px rgba(15,23,42,0.9); color: #fff; font-weight: 600; }
            .logo-text { font-size: 11px; letter-spacing: 0.22em; text-transform: uppercase; color: rgba(226,232,240,0.85); font-weight: 600; }
            .title { margin: 20px 0 4px; font-size: 20px; font-weight: 600; color: #f9fafb; }
            .subtitle { margin: 0; font-size: 13px; color: rgba(226,232,240,0.85); }
            .content { padding: 22px 24px 24px; background: radial-gradient(circle at top, rgba(15,118,110,0.21), transparent 60%); }
            .card { background: rgba(15,23,42,0.88); border-radius: 18px; padding: 18px 18px 20px; border: 1px solid rgba(15,118,110,0.45); box-shadow: 0 18px 38px rgba(15,23,42,0.9); }
            .paragraph { font-size: 13px; line-height: 1.6; color: #e5e7eb; margin: 0 0 10px; }
            .button-wrapper { text-align: center; margin: 18px 0 8px; }
            .button { display: inline-block; padding: 11px 28px; border-radius: 999px; background: linear-gradient(135deg, #10b981 0%, #059669 45%, #0f766e 100%); color: #ecfeff; text-decoration: none; font-size: 13px; font-weight: 600; box-shadow: 0 18px 35px rgba(5,150,105,0.65); border: 1px solid rgba(45,212,191,0.85); }
            .hint { font-size: 11px; color: #9ca3af; margin-top: 8px; text-align: center; }
            .footer { padding: 18px 24px 22px; border-top: 1px solid rgba(30,64,175,0.15); font-size: 11px; color: #6b7280; }
            .footer strong { color: #e5e7eb; }
          </style>
        </head>
        <body>
          <div class="wrapper">
            <div class="container">
              <div class="header">
                <div class="logo">
                  <div class="logo-badge">O</div>
                  <div class="logo-text">OggaHub</div>
                </div>
                <h1 class="title">Novo link de confirmação</h1>
                <p class="subtitle">Aqui está um novo acesso para você finalizar a ativação da sua conta.</p>
              </div>
              <div class="content">
                <div class="card">
                  <p class="paragraph">Clique no botão abaixo para confirmar seu e-mail e concluir o cadastro.</p>
                  <div class="button-wrapper">
                    <a href="${data.verifyUrl}" class="button">Confirmar meu e-mail</a>
                  </div>
                  <p class="hint">Se o botão não funcionar, copie e cole este link no navegador:<br />
                    <span style="word-break: break-all; color: #e5e7eb;">${data.verifyUrl}</span>
                  </p>
                </div>
              </div>
              <div class="footer">
                <p>Se você já confirmou seu e-mail recentemente, pode desconsiderar este aviso. Ele não altera o status atual da sua conta no <strong>OggaHub</strong>.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `,
  };
}

export function getNewRealtorApplicationAdminEmail(data: {
  applicantName?: string | null;
  applicantEmail?: string | null;
  adminUrl: string;
}) {
  return {
    subject: "Nova aplicação de corretor aguardando revisão",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #111827; }
            .container { max-width: 640px; margin: 0 auto; padding: 24px; background: #f9fafb; }
            .card { background: white; border-radius: 16px; border: 1px solid #e5e7eb; overflow: hidden; box-shadow: 0 10px 30px rgba(15,23,42,0.08); }
            .header { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: white; padding: 20px 24px; }
            .header h1 { margin: 0; font-size: 18px; }
            .content { padding: 20px 24px; }
            .btn { display: inline-block; margin-top: 12px; background: #0f172a; color: white; padding: 8px 16px; border-radius: 999px; text-decoration: none; font-weight: 600; font-size: 13px; }
            .small { font-size: 12px; color: #6b7280; margin-top: 16px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="card">
              <div class="header">
                <h1>Nova aplicação de corretor</h1>
              </div>
              <div class="content">
                <p>Você recebeu uma nova solicitação para se tornar corretor(a) na plataforma.</p>
                <p>
                  <strong>Nome:</strong> ${data.applicantName || "(sem nome)"}<br/>
                  <strong>Email:</strong> ${data.applicantEmail || "(sem email)"}
                </p>
                <p>
                  <a href="${data.adminUrl}" class="btn">Abrir painel de aplicações</a>
                </p>
                <p class="small">
                  Este é um aviso automático sempre que uma nova aplicação é criada.
                </p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `,
  };
}

export function getRealtorApplicationApprovedEmail(data: {
  name: string;
  dashboardUrl: string;
}) {
  return {
    subject: "Sua aplicação como corretor foi aprovada!",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #111827; }
            .container { max-width: 640px; margin: 0 auto; padding: 24px; background: #f9fafb; }
            .card { background: white; border-radius: 16px; border: 1px solid #e5e7eb; overflow: hidden; box-shadow: 0 10px 30px rgba(15,23,42,0.08); }
            .header { background: linear-gradient(135deg, #00736E 0%, #021616 100%); color: white; padding: 28px 32px; }
            .header h1 { margin: 0; font-size: 22px; }
            .content { padding: 24px 32px; }
            .btn { display: inline-block; margin-top: 16px; background: #00736E; color: white; padding: 10px 20px; border-radius: 999px; text-decoration: none; font-weight: 600; font-size: 14px; }
            .small { font-size: 12px; color: #6b7280; margin-top: 24px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="card">
              <div class="header">
                <h1>Parabéns, ${data.name}!</h1>
                <p style="margin-top:8px; opacity:0.9;">Sua aplicação para atuar como corretor(a) no OggaHub foi aprovada.</p>
              </div>
              <div class="content">
                <p>Seu perfil agora está habilitado como <strong>Corretor(a)</strong> na plataforma.</p>
                <p>Você já pode acessar seu painel, organizar leads e começar a receber oportunidades de clientes interessados.</p>
                <p>
                  <a href="${data.dashboardUrl}" class="btn">Ir para meu painel de corretor</a>
                </p>
                <p class="small">
                  Se você não esperava este email, desconsidere esta mensagem. Em caso de dúvidas, entre em contato com o suporte.
                </p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `,
  };
}

export function getRealtorApplicationRejectedEmail(data: {
  name: string;
  reason?: string;
}) {
  return {
    subject: "Atualização sobre sua aplicação como corretor",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #111827; }
            .container { max-width: 640px; margin: 0 auto; padding: 24px; background: #f9fafb; }
            .card { background: white; border-radius: 16px; border: 1px solid #fee2e2; overflow: hidden; box-shadow: 0 10px 30px rgba(220,38,38,0.06); }
            .header { background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%); color: white; padding: 28px 32px; }
            .header h1 { margin: 0; font-size: 20px; }
            .content { padding: 24px 32px; }
            .small { font-size: 12px; color: #6b7280; margin-top: 16px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="card">
              <div class="header">
                <h1>Oi, ${data.name}</h1>
              </div>
              <div class="content">
                <p>
                  Analisamos sua aplicação para atuar como corretor(a) no OggaHub, mas no momento ela não pôde ser aprovada.
                </p>
                ${data.reason ? `
                  <p><strong>Motivo informado:</strong></p>
                  <p>${data.reason}</p>
                ` : ``}
                <p class="small">
                  Você pode revisar seus dados e, se achar necessário, entrar em contato com o suporte para mais detalhes.
                </p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `,
  };
}

export function getPropertyFavoritedEmail(data: {
  propertyTitle: string;
  userName: string;
  propertyUrl: string;
}) {
  return {
    subject: `Seu imóvel foi favoritado: ${data.propertyTitle}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
            .button { display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">❤️ Imóvel Favoritado!</h1>
              <p style="margin: 10px 0 0;">${data.userName} adicionou seu imóvel aos favoritos</p>
            </div>
            <div class="content">
              <p>Boa notícia! Seu imóvel <strong>${data.propertyTitle}</strong> foi marcado como favorito.</p>
              <p>Isso significa que há interesse genuíno no seu anúncio. Continue mantendo-o atualizado e responda rapidamente aos contatos!</p>
              <center>
                <a href="${data.propertyUrl}" class="button">Ver Imóvel</a>
              </center>
            </div>
            <div class="footer">
              <p>© 2025 OggaHub. Todos os direitos reservados.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  };
}

export function getClientMessageNotificationEmail(data: {
  realtorName: string;
  clientName: string;
  propertyTitle: string;
  messagePreview: string;
  chatUrl: string;
}) {
  return {
    subject: `💬 Nova mensagem de ${data.clientName} sobre ${data.propertyTitle}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f3f4f6; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }
            .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
            .message-box { background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 0 8px 8px 0; margin: 20px 0; }
            .button { display: inline-block; background: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: 600; }
            .tip { background: #fef3c7; border-radius: 8px; padding: 12px 16px; margin-top: 20px; font-size: 13px; color: #92400e; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 24px;">💬 Nova Mensagem!</h1>
              <p style="margin: 10px 0 0; opacity: 0.9;">Um cliente enviou uma mensagem no chat</p>
            </div>
            <div class="content">
              <p>Olá, <strong>${data.realtorName}</strong>!</p>
              <p>Você recebeu uma nova mensagem de <strong>${data.clientName}</strong> sobre o imóvel:</p>
              <p><strong>Imóvel:</strong> ${data.propertyTitle}</p>
              
              <div class="message-box">
                <p style="margin: 0 0 8px; font-weight: bold; color: #3b82f6;">Mensagem:</p>
                <p style="margin: 0; font-style: italic; color: #374151;">"${data.messagePreview}"</p>
              </div>
              
              <center>
                <a href="${data.chatUrl}" class="button">Responder no Chat</a>
              </center>
              
              <div class="tip">
                💡 <strong>Dica:</strong> Responder rapidamente aumenta suas chances de conversão!
              </div>
            </div>
            <div class="footer">
              <p>© 2025 OggaHub. Todos os direitos reservados.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  };
}
 
export function getRealtorReplyNotificationEmail(data: {
  clientName: string;
  propertyTitle: string;
  messagePreview: string;
  chatUrl: string;
}) {
  return {
    subject: `💬 Nova resposta sobre ${data.propertyTitle}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #111827; margin: 0; padding: 0; background: #f3f4f6; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #0d9488 0%, #0891b2 100%); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }
            .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
            .message-box { background: #ecfeff; border-left: 4px solid #06b6d4; padding: 16px; border-radius: 0 8px 8px 0; margin: 20px 0; color: #0f172a; }
            .button { display: inline-block; background: linear-gradient(135deg, #0d9488 0%, #0891b2 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: 600; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 22px;">💬 Nova mensagem no chat</h1>
              <p style="margin: 10px 0 0; opacity: 0.9;">Sobre o imóvel ${data.propertyTitle}</p>
            </div>
            <div class="content">
              <p>Olá, <strong>${data.clientName}</strong>!</p>
              <p>O responsável pelo imóvel enviou uma nova mensagem para você no chat.</p>
              <div class="message-box">
                <p style="margin: 0 0 8px; font-weight: 600; color: #0f172a;">Prévia da mensagem:</p>
                <p style="margin: 0; font-style: italic; color: #334155;">"${data.messagePreview}"</p>
              </div>
              <center>
                <a href="${data.chatUrl}" class="button">Ver mensagem no chat</a>
              </center>
              <p style="font-size: 13px; color: #6b7280; margin-top: 16px;">
                Se o botão acima não funcionar, copie e cole este link no seu navegador:<br />
                <span style="color: #0d9488; word-break: break-all;">${data.chatUrl}</span>
              </p>
            </div>
            <div class="footer">
              <p>© 2025 OggaHub. Todos os direitos reservados.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  };
}

/**
 * Email de confirmação para o cliente com link do chat
 */
export function getClientConfirmationEmail(data: {
  clientName: string;
  propertyTitle: string;
  chatUrl: string;
  propertyUrl: string;
}) {
  return {
    subject: `Seu interesse em "${data.propertyTitle}" foi registrado!`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; background: #f3f4f6; }
            .container { max-width: 600px; margin: 0 auto; background: white; }
            .header { background: linear-gradient(135deg, #0d9488 0%, #0891b2 100%); color: white; padding: 40px 30px; text-align: center; }
            .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
            .header p { margin: 10px 0 0; opacity: 0.9; }
            .content { padding: 30px; }
            .success-badge { display: inline-block; background: #dcfce7; color: #166534; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: 500; margin-bottom: 20px; }
            .property-card { background: #f9fafb; border-radius: 12px; padding: 20px; margin: 20px 0; border: 1px solid #e5e7eb; }
            .property-title { font-size: 18px; font-weight: 600; color: #111827; margin-bottom: 8px; }
            .steps { margin: 30px 0; }
            .step { display: flex; align-items: flex-start; margin-bottom: 16px; }
            .step-number { width: 32px; height: 32px; background: #0d9488; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; flex-shrink: 0; }
            .step-content { margin-left: 16px; }
            .step-title { font-weight: 600; color: #111827; margin-bottom: 4px; }
            .step-desc { color: #6b7280; font-size: 14px; }
            .cta-button { display: inline-block; background: linear-gradient(135deg, #0d9488 0%, #0891b2 100%); color: white !important; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; margin: 20px 0; }
            .cta-button:hover { opacity: 0.9; }
            .tip-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0; border-radius: 0 8px 8px 0; }
            .tip-box strong { color: #92400e; }
            .footer { text-align: center; padding: 30px; color: #9ca3af; font-size: 12px; border-top: 1px solid #e5e7eb; }
            .footer a { color: #0d9488; text-decoration: none; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Mensagem Enviada!</h1>
              <p>Seu interesse foi registrado com sucesso</p>
            </div>
            <div class="content">
              <center>
                <span class="success-badge">🎉 Tudo certo!</span>
              </center>
              
              <p>Olá, <strong>${data.clientName}</strong>!</p>
              
              <p>Sua mensagem sobre o imóvel foi enviada. O proprietário ou corretor responsável será notificado e poderá entrar em contato com você em breve.</p>
              
              <div class="property-card">
                <div class="property-title">🏠 ${data.propertyTitle}</div>
                <a href="${data.propertyUrl}" style="color: #0d9488; font-size: 14px;">Ver detalhes do imóvel →</a>
              </div>
              
              <h3 style="color: #111827; margin-top: 30px;">📱 Acompanhe pelo Chat</h3>
              
              <p>Você pode continuar a conversa e receber atualizações através do nosso chat exclusivo:</p>
              
              <center>
                <a href="${data.chatUrl}" class="cta-button">
                  Abrir Chat
                </a>
              </center>
              
              <div class="steps">
                <h4 style="color: #6b7280; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 16px;">Próximos Passos</h4>
                
                <div class="step">
                  <div class="step-number">1</div>
                  <div class="step-content">
                    <div class="step-title">Aguarde o retorno</div>
                    <div class="step-desc">O responsável pelo imóvel receberá sua mensagem e poderá responder pelo chat.</div>
                  </div>
                </div>
                
                <div class="step">
                  <div class="step-number">2</div>
                  <div class="step-content">
                    <div class="step-title">Acompanhe pelo chat</div>
                    <div class="step-desc">Use o link acima para enviar mais perguntas ou verificar respostas.</div>
                  </div>
                </div>
                
                <div class="step">
                  <div class="step-number">3</div>
                  <div class="step-content">
                    <div class="step-title">Agende uma visita</div>
                    <div class="step-desc">Combine com o responsável um horário para conhecer o imóvel pessoalmente.</div>
                  </div>
                </div>
              </div>
              
              <div class="tip-box">
                <strong>💡 Dica:</strong> Salve o link do chat nos favoritos do seu navegador para acessar facilmente suas conversas!
              </div>
            </div>
            <div class="footer">
              <p>© 2025 OggaHub. Todos os direitos reservados.</p>
              <p>
                <a href="${data.propertyUrl}">Ver imóvel</a> · 
                <a href="${data.chatUrl}">Abrir chat</a>
              </p>
            </div>
          </div>
        </body>
      </html>
    `,
  };
}
