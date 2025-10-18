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
  // TODO: Configure with actual email service
  // For now, just log
  console.log("📧 Email sent:", { to, subject });
  
  // Example with fetch (configure endpoint)
  if (process.env.EMAIL_API_KEY) {
    try {
      // Replace with your email service API
      // const response = await fetch("https://api.resend.com/emails", {
      //   method: "POST",
      //   headers: {
      //     "Authorization": `Bearer ${process.env.EMAIL_API_KEY}`,
      //     "Content-Type": "application/json",
      //   },
      //   body: JSON.stringify({
      //     from: "noreply@zillowlike.com",
      //     to,
      //     subject,
      //     html,
      //   }),
      // });
      // return response.ok;
    } catch (error) {
      console.error("Email error:", error);
      return false;
    }
  }
  
  return true;
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
