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
  const apiKey = process.env.RESEND_API_KEY;

  // Se não houver API key configurada, apenas loga (modo desenvolvimento)
  if (!apiKey) {
    console.log("📧 [DEV MOCK] Email:", { to, subject });
    return true;
  }

  const from = process.env.EMAIL_FROM || "ZillowLike <onboarding@resend.dev>";

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      console.error("Email error (Resend):", response.status, text);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Email error (Resend):", error);
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
              <p>© 2025 Zillow. Todos os direitos reservados.</p>
              <p>Você está recebendo este email porque um usuário demonstrou interesse em seu imóvel.</p>
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
                <p style="margin-top:8px; opacity:0.9;">Sua aplicação para atuar como corretor(a) no ZillowLike foi aprovada.</p>
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
                  Analisamos sua aplicação para atuar como corretor(a) no ZillowLike, mas no momento ela não pôde ser aprovada.
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
              <p>© 2025 Zillow. Todos os direitos reservados.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  };
}
