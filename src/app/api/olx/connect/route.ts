import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { randomBytes } from "crypto";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { OLX_AUTH_URL, getPublicBaseUrl } from "@/lib/olx-api";

export async function GET(req: NextRequest) {
  const session: any = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const userId = String(session.userId || session.user?.id || "");
  if (!userId) {
    return NextResponse.json({ error: "Usuário não encontrado na sessão" }, { status: 400 });
  }

  const url = new URL(req.url);
  const returnTo = (url.searchParams.get("returnTo") || "").trim() || null;
  const teamIdParam = (url.searchParams.get("teamId") || "").trim() || null;
  const scopesParam = (url.searchParams.get("scopes") || "").trim() || null;

  const clientId = String(process.env.OLX_CLIENT_ID || "").trim();
  if (!clientId) {
    return NextResponse.json({ error: "Missing OLX_CLIENT_ID" }, { status: 500 });
  }

  const baseUrl = getPublicBaseUrl();
  const redirectUri = `${baseUrl}/api/olx/callback`;

  const defaultScopes = "autoupload autoservice chat basic_user_info";
  const scopes = scopesParam || defaultScopes;

  let teamId: string | null = null;
  if (teamIdParam) {
    const team = await (prisma as any).team.findUnique({
      where: { id: String(teamIdParam) },
      select: { id: true, ownerId: true },
    });
    if (!team) {
      return NextResponse.json({ error: "Time não encontrado" }, { status: 404 });
    }

    const isOwner = String(team.ownerId) === userId;
    const isMember = await (prisma as any).teamMember.findFirst({
      where: { teamId: String(team.id), userId },
      select: { id: true },
    });

    if (!isOwner && !isMember) {
      return NextResponse.json({ error: "Sem permissão para conectar OLX neste time" }, { status: 403 });
    }

    teamId = String(team.id);
  }

  const state = randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  await (prisma as any).olxOAuthState.create({
    data: {
      state,
      userId,
      teamId,
      returnTo,
      scopes,
      expiresAt,
    },
    select: { id: true },
  });

  const authUrl = new URL(OLX_AUTH_URL);
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", scopes);
  authUrl.searchParams.set("state", state);

  return NextResponse.redirect(authUrl.toString());
}
