import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decryptAccountToken, fetchOlxJson, olxAutouploadAdStatusUrl } from "@/lib/olx-api";

const Schema = z.object({
  propertyId: z.string().min(1),
  teamId: z.string().min(1).optional(),
});

export async function POST(req: NextRequest) {
  const session: any = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const userId = String(session.userId || session.user?.id || "");
  if (!userId) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 400 });

  const json = await req.json().catch(() => null);
  const parsed = Schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.issues }, { status: 400 });
  }

  const teamId = parsed.data.teamId ? String(parsed.data.teamId) : null;

  let account: any = null;
  if (teamId) {
    const team = await (prisma as any).team.findUnique({
      where: { id: teamId },
      select: { id: true, ownerId: true },
    });
    if (!team) return NextResponse.json({ error: "Time não encontrado" }, { status: 404 });

    const isOwner = String(team.ownerId) === userId;
    const isMember = await (prisma as any).teamMember.findFirst({
      where: { teamId: String(team.id), userId },
      select: { id: true },
    });
    if (!isOwner && !isMember) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    account = await (prisma as any).olxAccount.findUnique({ where: { teamId: String(team.id) } });
  } else {
    account = await (prisma as any).olxAccount.findUnique({ where: { userId } });
  }

  if (!account?.id) {
    return NextResponse.json({ error: "OLX account not connected" }, { status: 400 });
  }

  const listing: any = await (prisma as any).olxListing.findUnique({
    where: { accountId_propertyId: { accountId: String(account.id), propertyId: parsed.data.propertyId } },
  });

  if (!listing?.id || !listing.listId) {
    return NextResponse.json({ error: "Listing not found or missing listId" }, { status: 404 });
  }

  const token = decryptAccountToken(String(account.accessTokenEnc));

  const resp = await fetchOlxJson<any>(olxAutouploadAdStatusUrl(String(listing.listId)), {
    method: "GET",
    token,
  });

  if (resp.status < 200 || resp.status >= 300) {
    return NextResponse.json({ error: "OLX ad status failed", details: resp.data }, { status: 502 });
  }

  await (prisma as any).olxListing.update({
    where: { id: String(listing.id) },
    data: {
      status: resp.data?.status ? String(resp.data.status) : undefined,
      olxUrl: resp.data?.url ? String(resp.data.url) : undefined,
      lastUpdateAt: resp.data?.last_update ? new Date(String(resp.data.last_update)) : new Date(),
      raw: resp.data,
    },
  });

  return NextResponse.json({ success: true, olx: resp.data });
}
