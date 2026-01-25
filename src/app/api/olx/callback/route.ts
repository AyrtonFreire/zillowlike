import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { encryptSecret } from "@/lib/olx-crypto";
import {
  OLX_AUTOSERVICE_CHAT_WEBHOOK_URL,
  OLX_AUTOSERVICE_LEAD_URL,
  OLX_AUTOSERVICE_NOTIFICATION_URL,
  fetchOlxFormToken,
  fetchOlxJson,
  getPublicBaseUrl,
} from "@/lib/olx-api";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = (url.searchParams.get("code") || "").trim();
  const state = (url.searchParams.get("state") || "").trim();
  const error = (url.searchParams.get("error") || "").trim();

  if (error) {
    return NextResponse.json({ error: `OLX OAuth error: ${error}` }, { status: 400 });
  }

  if (!code || !state) {
    return NextResponse.json({ error: "Missing code/state" }, { status: 400 });
  }

  const stateRec: any = await (prisma as any).olxOAuthState.findUnique({
    where: { state },
  });

  if (!stateRec?.id) {
    return NextResponse.json({ error: "Invalid state" }, { status: 400 });
  }

  const expiresAtMs = stateRec?.expiresAt ? new Date(stateRec.expiresAt).getTime() : 0;
  if (!expiresAtMs || expiresAtMs < Date.now()) {
    try {
      await (prisma as any).olxOAuthState.delete({ where: { id: String(stateRec.id) } });
    } catch {}
    return NextResponse.json({ error: "State expired" }, { status: 400 });
  }

  const clientId = String(process.env.OLX_CLIENT_ID || "").trim();
  const clientSecret = String(process.env.OLX_CLIENT_SECRET || "").trim();
  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: "Missing OLX_CLIENT_ID/OLX_CLIENT_SECRET" }, { status: 500 });
  }

  const baseUrl = getPublicBaseUrl();
  const redirectUri = `${baseUrl}/api/olx/callback`;

  const { accessToken, tokenType } = await fetchOlxFormToken({
    code,
    redirectUri,
    clientId,
    clientSecret,
  });

  const scopesRaw = String(stateRec.scopes || "").trim();
  const scopesArr = scopesRaw ? scopesRaw.split(/\s+/).filter(Boolean) : [];

  const accessTokenEnc = encryptSecret(accessToken);

  const teamId = stateRec.teamId ? String(stateRec.teamId) : null;
  const userId = stateRec.userId ? String(stateRec.userId) : null;

  if (!teamId && !userId) {
    return NextResponse.json({ error: "OAuth state missing user/team context" }, { status: 500 });
  }

  let account: any = null;
  if (teamId) {
    account = await (prisma as any).olxAccount.findUnique({ where: { teamId } });
  } else {
    account = await (prisma as any).olxAccount.findUnique({ where: { userId } });
  }

  const webhookToken = String(account?.webhookToken || randomBytes(24).toString("hex"));

  if (account?.id) {
    account = await (prisma as any).olxAccount.update({
      where: { id: String(account.id) },
      data: {
        accessTokenEnc,
        tokenType: tokenType || "Bearer",
        scopes: scopesArr,
      },
    });
  } else {
    account = await (prisma as any).olxAccount.create({
      data: {
        userId: teamId ? null : userId,
        teamId: teamId || null,
        accessTokenEnc,
        tokenType: tokenType || "Bearer",
        scopes: scopesArr,
        webhookToken,
      },
    });
  }

  const leadWebhookUrl = `${baseUrl}/api/olx/webhook/lead/${encodeURIComponent(webhookToken)}`;
  const chatWebhookUrl = `${baseUrl}/api/olx/webhook/chat/${encodeURIComponent(webhookToken)}`;
  const notificationWebhookUrl = `${baseUrl}/api/olx/webhook/notification/${encodeURIComponent(webhookToken)}`;

  const updates: any = {};

  try {
    const leadResp = await fetchOlxJson<any>(OLX_AUTOSERVICE_LEAD_URL, {
      method: "POST",
      token: accessToken,
      body: {
        url: leadWebhookUrl,
        token: webhookToken,
      },
    });

    if (leadResp.status >= 200 && leadResp.status < 300) {
      if (leadResp.data?.id) updates.leadConfigId = String(leadResp.data.id);
      if (leadResp.data?.token) updates.leadConfigToken = String(leadResp.data.token);
      else updates.leadConfigToken = webhookToken;
    }
  } catch {}

  try {
    const chatResp = await fetchOlxJson<any>(OLX_AUTOSERVICE_CHAT_WEBHOOK_URL, {
      method: "POST",
      token: accessToken,
      body: {
        webhook: chatWebhookUrl,
      },
    });

    if (chatResp.status >= 200 && chatResp.status < 300) {
      updates.chatWebhookEnabled = true;
    }
  } catch {}

  try {
    const notifResp = await fetchOlxJson<any>(OLX_AUTOSERVICE_NOTIFICATION_URL, {
      method: "POST",
      token: accessToken,
      body: {
        method: "POST",
        url: notificationWebhookUrl,
        media_type: "application/json",
        token: webhookToken,
      },
    });

    if (notifResp.status >= 200 && notifResp.status < 300) {
      if (notifResp.data?.id) updates.notificationConfigId = String(notifResp.data.id);
      if (notifResp.data?.token) updates.notificationConfigToken = String(notifResp.data.token);
      else updates.notificationConfigToken = webhookToken;
    }
  } catch {}

  if (Object.keys(updates).length > 0) {
    await (prisma as any).olxAccount.update({
      where: { id: String(account.id) },
      data: updates,
    });
  }

  try {
    await (prisma as any).olxOAuthState.delete({ where: { id: String(stateRec.id) } });
  } catch {}

  const returnTo = stateRec.returnTo ? String(stateRec.returnTo) : null;
  const redirectTo = returnTo && returnTo.startsWith("/") ? `${baseUrl}${returnTo}` : `${baseUrl}/account`;

  return NextResponse.redirect(redirectTo);
}
