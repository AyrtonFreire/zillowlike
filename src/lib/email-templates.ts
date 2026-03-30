import { getEmailFrequencyLabel, getEmailInterestLabel } from "@/lib/communication-preferences";

export type EmailTemplateResult = {
  subject: string;
  html: string;
};

type EmailAction = {
  label: string;
  url: string;
};

type SummaryRow = {
  label: string;
  value: string;
  emphasize?: boolean;
  mono?: boolean;
};

type SummaryCard = {
  title?: string;
  rows?: SummaryRow[];
  contentHtml?: string;
};

type HighlightItem = {
  title: string;
  description: string;
  action?: EmailAction;
};

type StatItem = {
  label: string;
  value: string;
  hint?: string;
};

type EmailFrameOptions = {
  preheader: string;
  eyebrow: string;
  heroIcon: string;
  title: string;
  subtitle: string;
  intro?: string[];
  cards?: SummaryCard[];
  highlights?: HighlightItem[];
  stats?: StatItem[];
  messageBox?: { title: string; body: string };
  pills?: string[];
  primaryAction?: EmailAction;
  secondaryAction?: EmailAction;
  secondaryText?: string;
  footerNote?: string;
};

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://oggahub.com";
const FONT_STACK = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, Roboto, Helvetica, Arial, sans-serif";
const COLORS = {
  background: "#04110F",
  shell: "#071816",
  card: "#0C211D",
  cardAlt: "#102824",
  border: "#18423D",
  borderSoft: "#22524B",
  text: "#F5FFFD",
  muted: "#A4C6C0",
  subtle: "#7FA39C",
  brand: "#00736E",
  brandBright: "#009B91",
  brandSoft: "#143C38",
  accent: "#C7FFF5",
  danger: "#D45E6A",
  warning: "#D6A13E",
  success: "#28B98A",
  info: "#67D6CC",
};

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatMultiline(value: unknown): string {
  return escapeHtml(value).replace(/\r?\n/g, "<br />");
}

function parseSenderEmail() {
  const from = process.env.EMAIL_FROM || "OggaHub <no-reply@oggahub.com>";
  const fromMatch = String(from).match(/^(.*)<([^>]+)>\s*$/);
  return (fromMatch?.[2] || from).trim();
}

function getSupportEmail() {
  return (process.env.EMAIL_SUPPORT || process.env.SUPPORT_EMAIL || parseSenderEmail()).trim();
}

function spacer(height: number) {
  return `<div style="height:${height}px; line-height:${height}px; font-size:${height}px;">&nbsp;</div>`;
}

function renderParagraph(text: string) {
  return `<p style="margin:0 0 14px; font-family:${FONT_STACK}; font-size:15px; line-height:25px; color:${COLORS.muted};">${escapeHtml(text)}</p>`;
}

function renderButton(action: EmailAction, variant: "primary" | "secondary" = "primary") {
  const href = escapeHtml(action.url);
  const label = escapeHtml(action.label);
  const background =
    variant === "primary"
      ? `linear-gradient(135deg, ${COLORS.brandBright} 0%, ${COLORS.brand} 100%)`
      : COLORS.brandSoft;
  const backgroundColor = variant === "primary" ? COLORS.brand : COLORS.brandSoft;
  const borderColor = variant === "primary" ? COLORS.brandBright : COLORS.borderSoft;
  const textColor = variant === "primary" ? COLORS.text : COLORS.accent;

  return `
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" class="cta-full" style="border-collapse:separate;">
      <tr>
        <td align="center" bgcolor="${backgroundColor}" style="border-radius:16px; background:${background}; border:1px solid ${borderColor}; box-shadow:${variant === "primary" ? "0 18px 44px rgba(0, 155, 145, 0.24)" : "none"};">
          <!--[if mso]>
          <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${href}" style="height:48px;v-text-anchor:middle;width:220px;" arcsize="18%" strokeweight="1px" strokecolor="${borderColor}" fillcolor="${backgroundColor}">
            <w:anchorlock/>
            <center style="color:${textColor};font-family:${FONT_STACK};font-size:15px;font-weight:700;">${label}</center>
          </v:roundrect>
          <![endif]-->
          <!--[if !mso]><!-- -->
          <a href="${href}" style="display:inline-block; padding:15px 24px; font-family:${FONT_STACK}; font-size:15px; line-height:18px; font-weight:700; color:${textColor}; text-decoration:none; border-radius:16px; background:${background}; min-width:220px; text-align:center; box-sizing:border-box;">${label}</a>
          <!--<![endif]-->
        </td>
      </tr>
    </table>
  `;
}

function renderActions(primaryAction?: EmailAction, secondaryAction?: EmailAction) {
  if (!primaryAction && !secondaryAction) {
    return "";
  }

  return `
    ${spacer(10)}
    <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">
      <tr>
        ${primaryAction ? `<td class="stack" align="center" style="padding:0 6px 12px 0;">${renderButton(primaryAction, "primary")}</td>` : ""}
        ${secondaryAction ? `<td class="stack" align="center" style="padding:0 0 12px 6px;">${renderButton(secondaryAction, "secondary")}</td>` : ""}
      </tr>
    </table>
  `;
}

function renderSummaryRows(rows: SummaryRow[] = []) {
  if (!rows.length) {
    return "";
  }

  return `
    <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      ${rows
        .map(
          (row, index) => `
            <tr>
              <td style="padding:${index === 0 ? "0" : "12px 0 0"}; font-family:${FONT_STACK}; font-size:13px; line-height:18px; color:${COLORS.subtle}; text-transform:uppercase; letter-spacing:0.08em; width:34%; vertical-align:top;">${escapeHtml(row.label)}</td>
              <td style="padding:${index === 0 ? "0" : "12px 0 0"}; font-family:${FONT_STACK}; font-size:15px; line-height:23px; color:${row.emphasize ? COLORS.text : COLORS.muted}; font-weight:${row.emphasize ? "700" : "500"}; word-break:break-word; ${row.mono ? "font-family:Consolas, 'SFMono-Regular', Menlo, monospace;" : ""}">${row.mono ? escapeHtml(row.value) : formatMultiline(row.value)}</td>
            </tr>
          `
        )
        .join("")}
    </table>
  `;
}

function renderCard(card: SummaryCard) {
  return `
    <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background:${COLORS.cardAlt}; border:1px solid ${COLORS.border}; border-radius:22px;">
      <tr>
        <td style="padding:22px 22px 20px;">
          ${card.title ? `<div style="margin:0 0 14px; font-family:${FONT_STACK}; font-size:13px; line-height:18px; color:${COLORS.accent}; font-weight:700; text-transform:uppercase; letter-spacing:0.12em;">${escapeHtml(card.title)}</div>` : ""}
          ${card.contentHtml || renderSummaryRows(card.rows)}
        </td>
      </tr>
    </table>
  `;
}

function renderCards(cards: SummaryCard[] = []) {
  if (!cards.length) {
    return "";
  }

  return cards.map((card, index) => `${index ? spacer(14) : ""}${renderCard(card)}`).join("");
}

function renderPills(items: string[] = []) {
  if (!items.length) {
    return "";
  }

  return `
    <div style="margin:0 0 8px;">
      ${items
        .map(
          (item) =>
            `<span style="display:inline-block; margin:0 8px 8px 0; padding:8px 12px; border-radius:999px; background:rgba(0, 155, 145, 0.12); border:1px solid ${COLORS.borderSoft}; font-family:${FONT_STACK}; font-size:13px; line-height:16px; color:${COLORS.accent}; font-weight:600;">${escapeHtml(item)}</span>`
        )
        .join("")}
    </div>
  `;
}

function renderHighlights(items: HighlightItem[] = []) {
  if (!items.length) {
    return "";
  }

  return items
    .map(
      (item, index) => `
        ${index ? spacer(12) : ""}
        <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background:${COLORS.cardAlt}; border:1px solid ${COLORS.border}; border-radius:20px;">
          <tr>
            <td style="padding:18px 18px 16px;">
              <div style="margin:0 0 6px; font-family:${FONT_STACK}; font-size:16px; line-height:22px; color:${COLORS.text}; font-weight:700;">${escapeHtml(item.title)}</div>
              <div style="margin:0; font-family:${FONT_STACK}; font-size:14px; line-height:22px; color:${COLORS.muted};">${escapeHtml(item.description)}</div>
              ${item.action ? `<div style="margin-top:12px;"><a href="${escapeHtml(item.action.url)}" style="font-family:${FONT_STACK}; font-size:14px; line-height:20px; color:${COLORS.info}; text-decoration:none; font-weight:700;">${escapeHtml(item.action.label)} →</a></div>` : ""}
            </td>
          </tr>
        </table>
      `
    )
    .join("");
}

function renderStats(items: StatItem[] = []) {
  if (!items.length) {
    return "";
  }

  const cells = items
    .slice(0, 4)
    .map(
      (item) => `
        <td class="stack" width="50%" style="padding:0 6px 12px; vertical-align:top;">
          <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background:${COLORS.cardAlt}; border:1px solid ${COLORS.border}; border-radius:20px;">
            <tr>
              <td style="padding:18px 18px 16px;">
                <div style="font-family:${FONT_STACK}; font-size:28px; line-height:30px; color:${COLORS.text}; font-weight:800;">${escapeHtml(item.value)}</div>
                <div style="margin-top:8px; font-family:${FONT_STACK}; font-size:13px; line-height:18px; color:${COLORS.accent}; font-weight:700; text-transform:uppercase; letter-spacing:0.08em;">${escapeHtml(item.label)}</div>
                ${item.hint ? `<div style="margin-top:6px; font-family:${FONT_STACK}; font-size:13px; line-height:20px; color:${COLORS.muted};">${escapeHtml(item.hint)}</div>` : ""}
              </td>
            </tr>
          </table>
        </td>
      `
    )
    .join("");

  return `
    <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">
      <tr>
        ${cells}
      </tr>
    </table>
  `;
}

function renderMessageBox(title: string, body: string) {
  return `
    <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background:${COLORS.cardAlt}; border:1px solid ${COLORS.borderSoft}; border-radius:22px;">
      <tr>
        <td style="padding:20px 20px 18px;">
          <div style="margin:0 0 10px; font-family:${FONT_STACK}; font-size:13px; line-height:18px; color:${COLORS.accent}; font-weight:700; text-transform:uppercase; letter-spacing:0.12em;">${escapeHtml(title)}</div>
          <div style="margin:0; font-family:${FONT_STACK}; font-size:15px; line-height:25px; color:${COLORS.text};">${formatMultiline(body)}</div>
        </td>
      </tr>
    </table>
  `;
}

function renderLinkFallback(primaryAction?: EmailAction) {
  if (!primaryAction) {
    return "";
  }

  return `
    ${spacer(2)}
    <p style="margin:0; font-family:${FONT_STACK}; font-size:13px; line-height:22px; color:${COLORS.subtle}; text-align:center;">
      Se o botão não funcionar, copie e cole este link no navegador:<br />
      <a href="${escapeHtml(primaryAction.url)}" style="color:${COLORS.info}; text-decoration:none; word-break:break-all;">${escapeHtml(primaryAction.url)}</a>
    </p>
  `;
}

function renderEmailFrame(options: EmailFrameOptions) {
  const supportEmail = getSupportEmail();
  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="x-ua-compatible" content="ie=edge" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="color-scheme" content="dark light" />
    <meta name="supported-color-schemes" content="dark light" />
    <title>${escapeHtml(options.title)} · OggaHub</title>
    <style>
      @media only screen and (max-width: 620px) {
        .email-shell { width: 100% !important; }
        .email-body { padding-left: 20px !important; padding-right: 20px !important; }
        .email-header { padding-left: 20px !important; padding-right: 20px !important; }
        .email-footer { padding-left: 20px !important; padding-right: 20px !important; }
        .hero-title { font-size: 28px !important; line-height: 34px !important; }
        .stack { display: block !important; width: 100% !important; }
        .cta-full a { width: 100% !important; min-width: 0 !important; }
      }
    </style>
  </head>
  <body style="margin:0; padding:0; background:${COLORS.background}; background-color:${COLORS.background};">
    <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent; mso-hide:all;">${escapeHtml(options.preheader)}</div>
    <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="width:100%; border-collapse:collapse; background:${COLORS.background}; background-color:${COLORS.background};">
      <tr>
        <td align="center" style="padding:24px 12px 40px;">
          <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" class="email-shell" style="width:100%; max-width:600px; border-collapse:separate; background:${COLORS.shell}; background-color:${COLORS.shell}; border:1px solid ${COLORS.border}; border-radius:28px; overflow:hidden; box-shadow:0 32px 90px rgba(0,0,0,0.34);">
            <tr>
              <td class="email-header" style="padding:24px 28px 0;">
                <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="left">
                      <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                        <tr>
                          <td width="40" height="40" align="center" valign="middle" style="width:40px; height:40px; border-radius:999px; background:linear-gradient(135deg, ${COLORS.brandBright} 0%, ${COLORS.brand} 55%, ${COLORS.brandSoft} 100%); color:${COLORS.text}; font-family:${FONT_STACK}; font-size:18px; line-height:18px; font-weight:800;">O</td>
                          <td style="padding-left:10px; font-family:${FONT_STACK}; font-size:16px; line-height:18px; color:${COLORS.text}; font-weight:700; letter-spacing:0.02em;">OggaHub</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-top:18px;">
                      <div style="height:1px; background:linear-gradient(90deg, rgba(0,155,145,0) 0%, rgba(0,155,145,0.95) 50%, rgba(0,155,145,0) 100%);"></div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td class="email-body" style="padding:26px 28px 0;">
                <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="center" style="padding-bottom:16px;">
                      <div style="width:72px; height:72px; border-radius:999px; background:radial-gradient(circle at 30% 0%, rgba(199,255,245,0.34) 0%, rgba(0,155,145,0.22) 38%, rgba(7,24,22,1) 100%); border:1px solid ${COLORS.borderSoft}; box-shadow:0 18px 38px rgba(0,155,145,0.16); text-align:center; line-height:72px; font-size:32px;">${escapeHtml(options.heroIcon)}</div>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="font-family:${FONT_STACK}; font-size:12px; line-height:16px; color:${COLORS.accent}; font-weight:700; text-transform:uppercase; letter-spacing:0.18em;">${escapeHtml(options.eyebrow)}</td>
                  </tr>
                  <tr>
                    <td align="center" class="hero-title" style="padding-top:12px; font-family:${FONT_STACK}; font-size:36px; line-height:42px; color:${COLORS.text}; font-weight:800; letter-spacing:-0.02em;">${escapeHtml(options.title)}</td>
                  </tr>
                  <tr>
                    <td align="center" style="padding-top:12px; font-family:${FONT_STACK}; font-size:16px; line-height:26px; color:${COLORS.muted};">${escapeHtml(options.subtitle)}</td>
                  </tr>
                </table>
                ${spacer(24)}
                <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background:${COLORS.card}; background-color:${COLORS.card}; border:1px solid ${COLORS.border}; border-radius:24px;">
                  <tr>
                    <td style="padding:24px 22px 22px;">
                      ${(options.intro || []).map(renderParagraph).join("")}
                      ${options.pills?.length ? renderPills(options.pills) : ""}
                      ${options.stats?.length ? `${spacer(4)}${renderStats(options.stats)}` : ""}
                      ${options.cards?.length ? `${options.stats?.length ? spacer(12) : ""}${renderCards(options.cards)}` : ""}
                      ${options.highlights?.length ? `${options.cards?.length || options.stats?.length ? spacer(14) : ""}${renderHighlights(options.highlights)}` : ""}
                      ${options.messageBox ? `${(options.cards?.length || options.highlights?.length || options.stats?.length) ? spacer(14) : ""}${renderMessageBox(options.messageBox.title, options.messageBox.body)}` : ""}
                      ${renderActions(options.primaryAction, options.secondaryAction)}
                      ${options.secondaryText ? `${spacer(6)}<p style="margin:0; font-family:${FONT_STACK}; font-size:13px; line-height:22px; color:${COLORS.subtle}; text-align:center;">${options.secondaryText}</p>` : ""}
                      ${renderLinkFallback(options.primaryAction)}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td class="email-footer" style="padding:20px 28px 28px;">
                <div style="height:1px; background:rgba(34,82,75,0.72);"></div>
                <div style="padding-top:18px; font-family:${FONT_STACK}; font-size:13px; line-height:22px; color:${COLORS.subtle};">
                  ${options.footerNote ? `<div style="margin:0 0 10px;">${options.footerNote}</div>` : ""}
                  <div style="margin:0 0 6px;">Precisa de ajuda? <a href="mailto:${escapeHtml(supportEmail)}" style="color:${COLORS.info}; text-decoration:none;">${escapeHtml(supportEmail)}</a></div>
                  <div style="margin:0 0 6px;">OggaHub · tecnologia imobiliária com uma experiência simples, clara e profissional.</div>
                  <div style="margin:0;">&copy; ${year} OggaHub · <a href="${SITE_URL}" style="color:${COLORS.info}; text-decoration:none;">oggahub.com</a></div>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function maybeName(name?: string | null) {
  return name?.trim() ? name.trim() : "";
}

function greetingLine(name?: string | null) {
  const resolved = maybeName(name);
  return resolved ? `Olá, ${resolved}.` : "Olá.";
}

function statusLabel(status: "PUBLISHED" | "APPROVED" | "REJECTED" | "UPDATED") {
  if (status === "PUBLISHED") return "Publicado";
  if (status === "APPROVED") return "Aprovado";
  if (status === "REJECTED") return "Precisa de ajustes";
  return "Atualizado";
}

function billingStatusLabel(status: "paid" | "pending" | "failed" | "trial_ending") {
  if (status === "paid") return "Pagamento confirmado";
  if (status === "pending") return "Cobrança pendente";
  if (status === "failed") return "Falha na cobrança";
  return "Seu teste está terminando";
}

export function getAuthVerifyEmailEmail(data: {
  name?: string | null;
  verifyUrl: string;
}): EmailTemplateResult {
  return {
    subject: "Confirme seu e-mail no OggaHub",
    html: renderEmailFrame({
      preheader: "Confirme seu e-mail para ativar sua conta no OggaHub.",
      eyebrow: "Confirmação de conta",
      heroIcon: "✉️",
      title: "Confirme seu e-mail",
      subtitle: "Seu acesso está quase pronto.",
      intro: [
        greetingLine(data.name),
        "Obrigado por criar sua conta no OggaHub. Clique no botão abaixo para confirmar que este e-mail é seu e concluir a ativação.",
        "Esse passo leva só alguns segundos e ajuda a manter sua conta segura.",
      ],
      primaryAction: {
        label: "Confirmar meu e-mail",
        url: data.verifyUrl,
      },
      footerNote: "Se você não criou uma conta, pode ignorar este e-mail com segurança.",
    }),
  };
}

export function getWelcomeEmail(data: {
  name?: string | null;
  dashboardUrl: string;
  primaryUse?: string;
}): EmailTemplateResult {
  return {
    subject: "Boas-vindas ao OggaHub",
    html: renderEmailFrame({
      preheader: "Sua conta está pronta para começar.",
      eyebrow: "Boas-vindas",
      heroIcon: "👋",
      title: "Tudo pronto para começar",
      subtitle: "Agora você já pode explorar a plataforma com uma experiência simples e profissional.",
      intro: [
        greetingLine(data.name),
        "O OggaHub foi desenhado para ajudar você a comprar, alugar, anunciar e acompanhar oportunidades com clareza.",
        data.primaryUse ? `Seu foco atual: ${data.primaryUse}.` : "Se quiser, você pode personalizar sua jornada conforme seu momento no mercado imobiliário.",
      ],
      highlights: [
        {
          title: "Explore imóveis com menos ruído",
          description: "Use filtros rápidos, favoritos e páginas com informações claras para decidir com confiança.",
        },
        {
          title: "Centralize contatos e conversas",
          description: "Acompanhe leads, mensagens e movimentações em um fluxo mais organizado.",
        },
      ],
      primaryAction: {
        label: "Abrir minha conta",
        url: data.dashboardUrl,
      },
      footerNote: "Se precisar de ajuda nos primeiros passos, é só responder por um dos canais oficiais do OggaHub.",
    }),
  };
}

export function getAuthForgotPasswordEmail(data: {
  resetUrl: string;
}): EmailTemplateResult {
  return {
    subject: "Redefina sua senha no OggaHub",
    html: renderEmailFrame({
      preheader: "Recebemos um pedido para redefinir a senha da sua conta.",
      eyebrow: "Segurança",
      heroIcon: "🔐",
      title: "Crie uma nova senha",
      subtitle: "Use o link abaixo para continuar com segurança.",
      intro: [
        "Recebemos uma solicitação para redefinir a senha da sua conta.",
        "Por segurança, este link expira em 1 hora.",
        "Se você não pediu essa alteração, pode ignorar este e-mail. Sua senha atual continuará valendo.",
      ],
      primaryAction: {
        label: "Escolher nova senha",
        url: data.resetUrl,
      },
      footerNote: "O time do OggaHub nunca pede sua senha por e-mail ou mensagem.",
    }),
  };
}

export function getLeadNotificationEmail(data: {
  propertyTitle: string;
  userName: string;
  userEmail: string;
  userPhone?: string;
  message: string;
  propertyUrl: string;
}): EmailTemplateResult {
  const rows: SummaryRow[] = [
    { label: "Imóvel", value: data.propertyTitle, emphasize: true },
    { label: "Interessado", value: data.userName },
    { label: "E-mail", value: data.userEmail },
  ];

  if (data.userPhone?.trim()) {
    rows.push({ label: "Telefone", value: data.userPhone.trim() });
  }

  return {
    subject: `Novo lead em ${data.propertyTitle}`,
    html: renderEmailFrame({
      preheader: "Você recebeu um novo lead na plataforma.",
      eyebrow: "Leads",
      heroIcon: "🎯",
      title: "Você recebeu um novo lead",
      subtitle: "Há um novo interessado no seu anúncio.",
      intro: [
        "Uma nova pessoa entrou em contato com você pelo OggaHub.",
        "Responder rápido costuma aumentar a chance de conversão e manter a conversa aquecida.",
      ],
      cards: [
        { title: "Resumo do contato", rows },
      ],
      messageBox: {
        title: "Mensagem recebida",
        body: data.message,
      },
      primaryAction: {
        label: "Abrir anúncio",
        url: data.propertyUrl,
      },
      footerNote: "Você está recebendo este e-mail porque um interessado enviou uma nova mensagem pelo seu anúncio.",
    }),
  };
}

export function getClientMessageNotificationEmail(data: {
  realtorName: string;
  clientName: string;
  propertyTitle: string;
  messagePreview: string;
  chatUrl: string;
}): EmailTemplateResult {
  return {
    subject: `Nova mensagem de ${data.clientName} sobre ${data.propertyTitle}`,
    html: renderEmailFrame({
      preheader: "Um interessado enviou uma nova mensagem no chat.",
      eyebrow: "Mensagens",
      heroIcon: "💬",
      title: "Nova mensagem de interessado",
      subtitle: "O chat do imóvel recebeu uma nova interação.",
      intro: [
        `Olá, ${data.realtorName}.`,
        `Você recebeu uma nova mensagem de ${data.clientName} sobre o imóvel ${data.propertyTitle}.`,
      ],
      cards: [
        {
          title: "Contexto",
          rows: [
            { label: "Cliente", value: data.clientName },
            { label: "Imóvel", value: data.propertyTitle, emphasize: true },
          ],
        },
      ],
      messageBox: {
        title: "Prévia da mensagem",
        body: data.messagePreview,
      },
      primaryAction: {
        label: "Responder no chat",
        url: data.chatUrl,
      },
      footerNote: "Uma resposta rápida ajuda a manter o interesse e melhora a experiência de atendimento.",
    }),
  };
}

export function getAccountActivityAlertEmail(data: {
  name?: string | null;
  activityTitle: string;
  activityDescription: string;
  occurredAt?: string;
  locationLabel?: string;
  actionUrl: string;
  actionLabel: string;
}): EmailTemplateResult {
  const rows: SummaryRow[] = [{ label: "Atividade", value: data.activityTitle, emphasize: true }];

  if (data.occurredAt) {
    rows.push({ label: "Quando", value: data.occurredAt });
  }

  if (data.locationLabel) {
    rows.push({ label: "Origem", value: data.locationLabel });
  }

  return {
    subject: `${data.activityTitle} · OggaHub`,
    html: renderEmailFrame({
      preheader: "Detectamos uma atividade importante na sua conta.",
      eyebrow: "Conta",
      heroIcon: "🛡️",
      title: "Atividade importante na sua conta",
      subtitle: "Revise os detalhes abaixo para manter tudo sob controle.",
      intro: [
        greetingLine(data.name),
        data.activityDescription,
      ],
      cards: [{ title: "Detalhes", rows }],
      primaryAction: {
        label: data.actionLabel,
        url: data.actionUrl,
      },
      footerNote: "Se você reconhece essa atividade, não é necessário fazer nada.",
    }),
  };
}

export function getWeeklyPlatformSummaryEmail(data: {
  name?: string | null;
  weekLabel: string;
  overview: string;
  dashboardUrl: string;
  stats?: StatItem[];
  highlights?: HighlightItem[];
}): EmailTemplateResult {
  return {
    subject: `Seu resumo semanal · ${data.weekLabel}`,
    html: renderEmailFrame({
      preheader: "Veja um resumo rápido da sua semana no OggaHub.",
      eyebrow: "Resumo semanal",
      heroIcon: "📊",
      title: "Seu resumo da semana",
      subtitle: data.weekLabel,
      intro: [
        greetingLine(data.name),
        data.overview,
      ],
      stats: data.stats,
      highlights: data.highlights,
      primaryAction: {
        label: "Abrir meu painel",
        url: data.dashboardUrl,
      },
      footerNote: "Um panorama curto para você acompanhar o que mais importa sem perder tempo.",
    }),
  };
}

export function getListingStatusEmail(data: {
  name?: string | null;
  propertyTitle: string;
  status: "PUBLISHED" | "APPROVED" | "REJECTED" | "UPDATED";
  propertyUrl: string;
  details?: string;
  checklist?: string[];
}): EmailTemplateResult {
  const statusText = statusLabel(data.status);
  const subtitle =
    data.status === "PUBLISHED"
      ? "Seu anúncio já está no ar."
      : data.status === "APPROVED"
        ? "Seu anúncio foi revisado e aprovado."
        : data.status === "REJECTED"
          ? "Seu anúncio precisa de alguns ajustes antes de seguir."
          : "Seu anúncio recebeu uma atualização importante.";

  return {
    subject: `${statusText}: ${data.propertyTitle}`,
    html: renderEmailFrame({
      preheader: `Status do anúncio: ${statusText}.`,
      eyebrow: "Anúncios",
      heroIcon: "🏡",
      title: `Anúncio ${statusText.toLowerCase()}`,
      subtitle,
      intro: [
        greetingLine(data.name),
        `O imóvel ${data.propertyTitle} está com o status ${statusText} no OggaHub.`,
        ...(data.details ? [data.details] : []),
      ],
      cards: [
        {
          title: "Resumo",
          rows: [
            { label: "Imóvel", value: data.propertyTitle, emphasize: true },
            { label: "Status", value: statusText },
          ],
        },
      ],
      highlights: data.checklist?.map((item) => ({
        title: item,
        description: "Siga este ponto para manter seu anúncio claro, completo e competitivo.",
      })),
      primaryAction: {
        label: data.status === "REJECTED" ? "Revisar anúncio" : "Ver anúncio",
        url: data.propertyUrl,
      },
      footerNote: "Manter fotos, descrição e preço atualizados melhora a qualidade do anúncio e a confiança dos interessados.",
    }),
  };
}

export function getProductUpdateEmail(data: {
  name?: string | null;
  featureName: string;
  summary: string;
  highlights: string[];
  actionUrl: string;
  actionLabel: string;
}): EmailTemplateResult {
  return {
    subject: `Novidade no OggaHub: ${data.featureName}`,
    html: renderEmailFrame({
      preheader: "Uma nova funcionalidade chegou ao OggaHub.",
      eyebrow: "Produto",
      heroIcon: "✨",
      title: data.featureName,
      subtitle: "Uma atualização para deixar sua experiência mais simples e eficiente.",
      intro: [
        greetingLine(data.name),
        data.summary,
      ],
      highlights: data.highlights.map((item) => ({
        title: item,
        description: "Pensado para reduzir fricção e deixar sua rotina mais fluida dentro da plataforma.",
      })),
      primaryAction: {
        label: data.actionLabel,
        url: data.actionUrl,
      },
      footerNote: "Seguimos evoluindo o produto para manter a experiência cada vez mais clara, moderna e confiável.",
    }),
  };
}

export function getBillingNotificationEmail(data: {
  name?: string | null;
  planName: string;
  amountLabel: string;
  cycleLabel: string;
  status: "paid" | "pending" | "failed" | "trial_ending";
  dueDate?: string;
  actionUrl: string;
  actionLabel: string;
}): EmailTemplateResult {
  const rows: SummaryRow[] = [
    { label: "Plano", value: data.planName, emphasize: true },
    { label: "Valor", value: data.amountLabel },
    { label: "Ciclo", value: data.cycleLabel },
  ];

  if (data.dueDate) {
    rows.push({ label: "Data", value: data.dueDate });
  }

  return {
    subject: `${billingStatusLabel(data.status)} · ${data.planName}`,
    html: renderEmailFrame({
      preheader: billingStatusLabel(data.status),
      eyebrow: "Cobrança",
      heroIcon: "💳",
      title: billingStatusLabel(data.status),
      subtitle: "Confira os detalhes da sua assinatura abaixo.",
      intro: [
        greetingLine(data.name),
        data.status === "paid"
          ? "Seu pagamento foi confirmado e sua assinatura segue ativa normalmente."
          : data.status === "pending"
            ? "Há uma cobrança aguardando confirmação na sua conta."
            : data.status === "failed"
              ? "Não conseguimos concluir a cobrança da sua assinatura."
              : "Seu período de teste está perto do fim. Se quiser continuar, revise sua assinatura.",
      ],
      cards: [{ title: "Resumo da assinatura", rows }],
      primaryAction: {
        label: data.actionLabel,
        url: data.actionUrl,
      },
      footerNote: "Se esta cobrança não era esperada, revise sua conta e fale com o time do OggaHub.",
    }),
  };
}

export function getEmailSubscriptionWelcomeEmail(data: {
  email: string;
  name?: string | null;
  interests: string[];
  frequency: string;
  city?: string | null;
  state?: string | null;
  preferencesUrl: string;
}): EmailTemplateResult {
  const interests = data.interests.map((item) => getEmailInterestLabel(item));
  const region = [data.city, data.state].filter(Boolean).join(" / ");

  return {
    subject: "Sua newsletter do OggaHub está ativa",
    html: renderEmailFrame({
      preheader: "Seu cadastro na newsletter foi confirmado.",
      eyebrow: "Newsletter",
      heroIcon: "📬",
      title: "Assinatura ativada",
      subtitle: "A partir de agora, você recebe conteúdos e oportunidades mais alinhados ao seu momento.",
      intro: [
        greetingLine(data.name),
        `O e-mail ${data.email} foi confirmado para receber comunicações do OggaHub.`,
        "Mantivemos a experiência simples: conteúdo relevante, menos ruído e frequência previsível.",
      ],
      pills: interests,
      cards: [
        {
          title: "Preferências atuais",
          rows: [
            { label: "Frequência", value: getEmailFrequencyLabel(data.frequency) },
            ...(region ? [{ label: "Região", value: region }] : []),
            { label: "E-mail", value: data.email },
          ],
        },
      ],
      primaryAction: {
        label: "Gerenciar newsletter",
        url: data.preferencesUrl,
      },
      footerNote: "Você pode ajustar preferências, interesses e frequência sempre que quiser.",
    }),
  };
}

export function getPropertyAlertEmail(data: {
  name?: string | null;
  searchLabel: string;
  frequency: string;
  searchUrl: string;
  preferencesUrl: string;
  matches: Array<{
    title: string;
    location: string;
    priceLabel: string;
    propertyUrl: string;
  }>;
}): EmailTemplateResult {
  return {
    subject: `${data.matches.length} novo(s) imóvel(is) para ${data.searchLabel}`,
    html: renderEmailFrame({
      preheader: `Encontramos ${data.matches.length} novo(s) imóvel(is) para o seu alerta.`,
      eyebrow: "Alertas",
      heroIcon: "🔎",
      title: "Novos imóveis para você",
      subtitle: `${data.searchLabel} · ${getEmailFrequencyLabel(data.frequency)}`,
      intro: [
        greetingLine(data.name),
        `Encontramos ${data.matches.length} novo(s) imóvel(is) compatíveis com o alerta ${data.searchLabel}.`,
      ],
      highlights: data.matches.map((item) => ({
        title: item.title,
        description: `${item.location} · ${item.priceLabel}`,
        action: { label: "Ver imóvel", url: item.propertyUrl },
      })),
      primaryAction: {
        label: "Ver busca completa",
        url: data.searchUrl,
      },
      secondaryAction: {
        label: "Ajustar preferências",
        url: data.preferencesUrl,
      },
      footerNote: "Alertas pensados para ajudar você a agir mais rápido quando surgir algo relevante.",
    }),
  };
}

export function getRecoveryEmailCodeEmail(data: {
  name?: string | null;
  code: string;
}): EmailTemplateResult {
  return {
    subject: "Confirme seu e-mail de recuperação no OggaHub",
    html: renderEmailFrame({
      preheader: "Use este código para confirmar seu e-mail de recuperação.",
      eyebrow: "Segurança",
      heroIcon: "🛡️",
      title: "Confirme seu e-mail de recuperação",
      subtitle: "Digite o código abaixo na tela de confirmação.",
      intro: [
        greetingLine(data.name),
        "Este código expira em 10 minutos.",
      ],
      cards: [
        {
          title: "Código de verificação",
          contentHtml: `<div style="font-family:Consolas, 'SFMono-Regular', Menlo, monospace; font-size:30px; line-height:34px; letter-spacing:0.22em; color:${COLORS.text}; text-align:center; font-weight:800; padding:8px 0;">${escapeHtml(data.code)}</div>`,
        },
      ],
      footerNote: "Se você não solicitou essa ação, ignore este e-mail.",
    }),
  };
}

export function getEmailChangeCodeEmail(data: {
  name?: string | null;
  code: string;
}): EmailTemplateResult {
  return {
    subject: "Confirme a alteração do seu e-mail no OggaHub",
    html: renderEmailFrame({
      preheader: "Use este código para confirmar a alteração do seu e-mail.",
      eyebrow: "Conta",
      heroIcon: "🔄",
      title: "Confirme a troca de e-mail",
      subtitle: "Use o código abaixo para concluir a alteração.",
      intro: [
        greetingLine(data.name),
        "Esse código expira em 10 minutos e foi gerado para proteger sua conta.",
      ],
      cards: [
        {
          title: "Código de verificação",
          contentHtml: `<div style="font-family:Consolas, 'SFMono-Regular', Menlo, monospace; font-size:30px; line-height:34px; letter-spacing:0.22em; color:${COLORS.text}; text-align:center; font-weight:800; padding:8px 0;">${escapeHtml(data.code)}</div>`,
        },
      ],
      footerNote: "Se você não solicitou essa alteração, ignore este e-mail e revise a segurança da sua conta.",
    }),
  };
}

export function getRealtorRatingRequestEmail(data: {
  userName?: string | null;
  realtorName: string;
  propertyTitle?: string | null;
  profileUrl: string;
}): EmailTemplateResult {
  return {
    subject: `Avalie seu atendimento com ${data.realtorName}`,
    html: renderEmailFrame({
      preheader: "Sua avaliação ajuda a melhorar os atendimentos dentro da plataforma.",
      eyebrow: "Avaliação",
      heroIcon: "⭐",
      title: "Como foi seu atendimento?",
      subtitle: "Sua resposta leva menos de um minuto.",
      intro: [
        greetingLine(data.userName),
        `Você falou com ${data.realtorName} recentemente${data.propertyTitle ? ` sobre ${data.propertyTitle}` : ""}.`,
        "Sua avaliação ajuda outras pessoas e contribui para uma experiência melhor dentro do OggaHub.",
      ],
      primaryAction: {
        label: "Avaliar atendimento",
        url: data.profileUrl,
      },
      footerNote: "Você recebeu este e-mail porque interagiu com um profissional pela plataforma.",
    }),
  };
}

export function getAuthResendVerificationEmail(data: {
  verifyUrl: string;
}): EmailTemplateResult {
  return {
    subject: "Novo link de confirmação · OggaHub",
    html: renderEmailFrame({
      preheader: "Aqui está um novo link para confirmar seu e-mail.",
      eyebrow: "Confirmação de conta",
      heroIcon: "📨",
      title: "Seu novo link está pronto",
      subtitle: "Use este acesso para concluir a ativação da conta.",
      intro: [
        "Geramos um novo link de confirmação para você continuar o cadastro sem fricção.",
      ],
      primaryAction: {
        label: "Confirmar meu e-mail",
        url: data.verifyUrl,
      },
      footerNote: "Se você já confirmou sua conta, pode ignorar esta mensagem.",
    }),
  };
}

export function getNewRealtorApplicationAdminEmail(data: {
  applicantName?: string | null;
  applicantEmail?: string | null;
  adminUrl: string;
}): EmailTemplateResult {
  return {
    subject: "Nova aplicação de corretor aguardando revisão",
    html: renderEmailFrame({
      preheader: "Há uma nova aplicação aguardando análise administrativa.",
      eyebrow: "Admin",
      heroIcon: "📥",
      title: "Nova aplicação de corretor",
      subtitle: "Uma nova solicitação entrou na fila de revisão.",
      intro: [
        "Um novo cadastro de corretor foi enviado e está pronto para análise.",
      ],
      cards: [
        {
          title: "Dados do solicitante",
          rows: [
            { label: "Nome", value: data.applicantName || "Sem nome" },
            { label: "E-mail", value: data.applicantEmail || "Sem e-mail" },
          ],
        },
      ],
      primaryAction: {
        label: "Abrir revisão",
        url: data.adminUrl,
      },
      footerNote: "Este aviso é enviado sempre que uma nova aplicação é criada.",
    }),
  };
}

export function getRealtorApplicationApprovedEmail(data: {
  name: string;
  dashboardUrl: string;
}): EmailTemplateResult {
  return {
    subject: "Sua aplicação como corretor foi aprovada",
    html: renderEmailFrame({
      preheader: "Seu perfil foi aprovado para atuar como corretor no OggaHub.",
      eyebrow: "Corretor",
      heroIcon: "🎉",
      title: "Você foi aprovado",
      subtitle: "Seu perfil agora está habilitado para operar como corretor na plataforma.",
      intro: [
        `Olá, ${data.name}.`,
        "Seu cadastro foi aprovado e você já pode acessar o painel para acompanhar leads, mensagens e oportunidades.",
      ],
      primaryAction: {
        label: "Abrir painel do corretor",
        url: data.dashboardUrl,
      },
      footerNote: "Se você não esperava esta atualização, revise sua conta e entre em contato pelos canais oficiais.",
    }),
  };
}

export function getRealtorApplicationRejectedEmail(data: {
  name: string;
  reason?: string;
}): EmailTemplateResult {
  return {
    subject: "Atualização sobre sua aplicação como corretor",
    html: renderEmailFrame({
      preheader: "Sua aplicação foi analisada e precisa de revisão.",
      eyebrow: "Corretor",
      heroIcon: "📝",
      title: "Sua aplicação precisa de ajustes",
      subtitle: "No momento, ela não pôde ser aprovada.",
      intro: [
        `Olá, ${data.name}.`,
        "Analisamos sua solicitação para atuar como corretor no OggaHub.",
        "Você pode revisar as informações enviadas e tentar novamente quando fizer sentido.",
      ],
      cards: data.reason
        ? [
            {
              title: "Motivo informado",
              contentHtml: `<div style="font-family:${FONT_STACK}; font-size:15px; line-height:25px; color:${COLORS.text};">${formatMultiline(data.reason)}</div>`,
            },
          ]
        : undefined,
      footerNote: "Se precisar de contexto adicional, fale com o time do OggaHub.",
    }),
  };
}

export function getPropertyFavoritedEmail(data: {
  propertyTitle: string;
  userName: string;
  propertyUrl: string;
}): EmailTemplateResult {
  return {
    subject: `Seu anúncio recebeu um favorito: ${data.propertyTitle}`,
    html: renderEmailFrame({
      preheader: "Seu anúncio ganhou um novo favorito.",
      eyebrow: "Anúncios",
      heroIcon: "❤️",
      title: "Seu anúncio chamou atenção",
      subtitle: "Um usuário adicionou seu imóvel aos favoritos.",
      intro: [
        `O imóvel ${data.propertyTitle} foi favoritado por ${data.userName}.`,
        "Esse é um bom sinal de interesse. Manter o anúncio completo e atualizado pode ajudar no próximo passo da conversão.",
      ],
      primaryAction: {
        label: "Ver anúncio",
        url: data.propertyUrl,
      },
      footerNote: "Este é um aviso automático sobre o desempenho do seu anúncio.",
    }),
  };
}

export function getRealtorReplyNotificationEmail(data: {
  clientName: string;
  propertyTitle: string;
  messagePreview: string;
  chatUrl: string;
}): EmailTemplateResult {
  return {
    subject: `Nova resposta sobre ${data.propertyTitle}`,
    html: renderEmailFrame({
      preheader: "Você recebeu uma nova resposta no chat.",
      eyebrow: "Mensagens",
      heroIcon: "💬",
      title: "Nova mensagem no chat",
      subtitle: `Sobre o imóvel ${data.propertyTitle}`,
      intro: [
        `Olá, ${data.clientName}.`,
        "O responsável pelo imóvel respondeu sua conversa no chat do OggaHub.",
      ],
      messageBox: {
        title: "Prévia da mensagem",
        body: data.messagePreview,
      },
      primaryAction: {
        label: "Abrir conversa",
        url: data.chatUrl,
      },
      footerNote: "Assim você acompanha tudo em um único lugar, sem perder o contexto da negociação.",
    }),
  };
}

export function getClientConfirmationEmail(data: {
  clientName: string;
  propertyTitle: string;
  chatUrl: string;
  propertyUrl: string;
}): EmailTemplateResult {
  return {
    subject: `Sua mensagem sobre ${data.propertyTitle} foi enviada`,
    html: renderEmailFrame({
      preheader: "Seu interesse foi registrado com sucesso.",
      eyebrow: "Contato enviado",
      heroIcon: "✅",
      title: "Mensagem enviada com sucesso",
      subtitle: "Agora é só acompanhar a conversa no chat.",
      intro: [
        `Olá, ${data.clientName}.`,
        `Sua mensagem sobre ${data.propertyTitle} já foi entregue ao responsável pelo anúncio.`,
        "Você pode continuar a conversa, receber respostas e organizar tudo pelo mesmo link.",
      ],
      cards: [
        {
          title: "Imóvel",
          rows: [{ label: "Título", value: data.propertyTitle, emphasize: true }],
        },
      ],
      highlights: [
        {
          title: "Acompanhe o retorno pelo chat",
          description: "Use o mesmo acesso para responder, mandar novas perguntas e acompanhar atualizações.",
          action: { label: "Abrir chat", url: data.chatUrl },
        },
        {
          title: "Revise o anúncio quando quiser",
          description: "Se precisar retomar detalhes do imóvel, volte para a página completa do anúncio.",
          action: { label: "Ver imóvel", url: data.propertyUrl },
        },
      ],
      primaryAction: {
        label: "Abrir chat",
        url: data.chatUrl,
      },
      footerNote: "Guardar este link facilita acompanhar a conversa sem perder o contexto.",
    }),
  };
}

export function getTeamInviteEmail(data: {
  inviterName: string;
  teamName: string;
  acceptUrl: string;
}): EmailTemplateResult {
  return {
    subject: `Convite para o time ${data.teamName} · OggaHub`,
    html: renderEmailFrame({
      preheader: `Você foi convidado para entrar no time ${data.teamName}.`,
      eyebrow: "Times",
      heroIcon: "🤝",
      title: "Você recebeu um convite",
      subtitle: "Entre no time e continue sua operação com tudo centralizado.",
      intro: [
        `Você foi convidado para entrar no time ${data.teamName} no OggaHub.`,
      ],
      cards: [
        {
          title: "Convite",
          rows: [
            { label: "Time", value: data.teamName, emphasize: true },
            { label: "Enviado por", value: data.inviterName },
          ],
        },
      ],
      primaryAction: {
        label: "Aceitar convite",
        url: data.acceptUrl,
      },
      footerNote: "Se você não esperava este convite, pode ignorar esta mensagem com segurança.",
    }),
  };
}

export function getEmailTemplateShowcase(baseUrl: string = SITE_URL) {
  return {
    emailConfirmation: getAuthVerifyEmailEmail({ name: "Marina", verifyUrl: `${baseUrl}/auth/verify-email?token=demo` }),
    welcome: getWelcomeEmail({ name: "Marina", dashboardUrl: `${baseUrl}/account`, primaryUse: "Encontrar um imóvel" }),
    passwordReset: getAuthForgotPasswordEmail({ resetUrl: `${baseUrl}/auth/reset-password?token=demo` }),
    newLead: getLeadNotificationEmail({
      propertyTitle: "Casa moderna no centro",
      userName: "Lucas Andrade",
      userEmail: "lucas@example.com",
      userPhone: "(87) 99999-9999",
      message: "Gostei muito do imóvel e queria saber se ainda está disponível para visita nesta semana.",
      propertyUrl: `${baseUrl}/property/1`,
    }),
    interestedMessage: getClientMessageNotificationEmail({
      realtorName: "Camila",
      clientName: "Lucas Andrade",
      propertyTitle: "Apartamento com varanda",
      messagePreview: "Gostaria de saber se o condomínio já está incluso no valor anunciado.",
      chatUrl: `${baseUrl}/chat/demo`,
    }),
    accountActivity: getAccountActivityAlertEmail({
      name: "Marina",
      activityTitle: "Novo acesso detectado",
      activityDescription: "Detectamos um novo acesso à sua conta. Se foi você, não precisa fazer nada.",
      occurredAt: "Hoje às 14:12",
      locationLabel: "Petrolina, PE",
      actionUrl: `${baseUrl}/account/security`,
      actionLabel: "Revisar atividade",
    }),
    weeklySummary: getWeeklyPlatformSummaryEmail({
      name: "Marina",
      weekLabel: "24 a 30 de março",
      overview: "Nesta semana sua conta teve mais visualizações, novos favoritos e mensagens de interessados.",
      dashboardUrl: `${baseUrl}/dashboard`,
      stats: [
        { label: "Visualizações", value: "+128" },
        { label: "Favoritos", value: "14" },
        { label: "Mensagens", value: "6" },
        { label: "Leads", value: "3" },
      ],
      highlights: [
        { title: "Mais interesse no anúncio do centro", description: "Seu anúncio recebeu 2 novas mensagens e 6 favoritos." },
        { title: "Tempo de resposta mais rápido", description: "Você respondeu em média 35% mais rápido do que na semana anterior." },
      ],
    }),
    listingStatus: getListingStatusEmail({
      name: "Marina",
      propertyTitle: "Cobertura com vista para o rio",
      status: "APPROVED",
      propertyUrl: `${baseUrl}/property/2`,
      details: "Seu anúncio foi revisado com sucesso e já está elegível para ganhar tração na plataforma.",
    }),
    productUpdate: getProductUpdateEmail({
      name: "Marina",
      featureName: "Novo painel de mensagens",
      summary: "Lançamos uma experiência mais clara para acompanhar conversas com interessados e clientes.",
      highlights: ["Histórico mais organizado", "Visual premium mobile-first", "Ações rápidas para responder"],
      actionUrl: `${baseUrl}/dashboard`,
      actionLabel: "Conhecer a novidade",
    }),
    billing: getBillingNotificationEmail({
      name: "Marina",
      planName: "OggaHub Pro",
      amountLabel: "R$ 89,90",
      cycleLabel: "Mensal",
      status: "pending",
      dueDate: "05/04/2026",
      actionUrl: `${baseUrl}/account/billing`,
      actionLabel: "Revisar cobrança",
    }),
  };
}
