import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decryptAccountToken, fetchOlxJson, olxAutouploadImportStatusUrl } from "@/lib/olx-api";

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

  if (!listing?.id || !listing.lastImportToken) {
    return NextResponse.json({ error: "Listing not found or missing import token" }, { status: 404 });
  }

  const token = decryptAccountToken(String(account.accessTokenEnc));

  const resp = await fetchOlxJson<any>(olxAutouploadImportStatusUrl(String(listing.lastImportToken)), {
    method: "POST",
    body: { access_token: token },
  });

  let listId: string | null = null;
  let url: string | null = null;
  let adStatus: string | null = null;

  try {
    const ads = Array.isArray(resp.data?.ads) ? resp.data.ads : [];
    const first = ads[0] || null;
    if (first) {
      if (first.list_id != null) listId = String(first.list_id);
      if (first.url != null) url = String(first.url);
      if (first.status != null) adStatus = String(first.status);
    }
  } catch {}

  await (prisma as any).olxListing.update({
    where: { id: String(listing.id) },
    data: {
      lastImportCheckedAt: new Date(),
      lastImportStatus: resp.data?.autoupload_status ? String(resp.data.autoupload_status) : undefined,
      listId: listId || undefined,
      olxUrl: url || undefined,
      status: adStatus || undefined,
      raw: resp.data,
    },
  });

  return NextResponse.json({ success: true, olx: resp.data, listId, url, status: adStatus });
}
