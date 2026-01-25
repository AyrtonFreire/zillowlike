import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, context: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await context.params;

    const account: any = await (prisma as any).olxAccount.findUnique({
      where: { webhookToken: String(token) },
      select: { id: true, webhookToken: true, notificationConfigToken: true },
    });

    if (!account?.id) {
      return NextResponse.json({ ok: true }, { status: 404 });
    }

    const body: any = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const tokenHeader = (req.headers.get("x-olx-token") || "").trim();
    const authHeader = (req.headers.get("authorization") || "").trim();
    const bearer = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : "";
    const provided = tokenHeader || bearer;
    const expected = String(account.notificationConfigToken || account.webhookToken || "").trim();
    if (expected && provided !== expected) {
      return NextResponse.json({ ok: true }, { status: 401 });
    }

    const notificationId = body.id != null ? String(body.id) : "";
    if (!notificationId) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    void (async () => {
      const createdAtRemote = body.created_at ? new Date(String(body.created_at)) : null;
      const createdAtRemoteSafe =
        createdAtRemote && !Number.isNaN(createdAtRemote.getTime()) ? createdAtRemote : null;

      const topic = body.topic != null ? String(body.topic) : null;
      const ad = body.data?.ad || null;
      const actions = body.data?.actions || null;

      const listId = ad?.list_id != null ? String(ad.list_id) : ad?.listId != null ? String(ad.listId) : null;
      const adId = ad?.id != null ? String(ad.id) : null;
      const category = ad?.category != null ? Number(ad.category) : null;
      const status = ad?.status != null ? String(ad.status) : null;
      const operation = ad?.operation != null ? String(ad.operation) : null;
      const reasonTag = ad?.reason_tag != null ? String(ad.reason_tag) : null;
      const message = ad?.message != null ? String(ad.message) : null;
      const viewUrl = actions?.view != null ? String(actions.view) : null;

      try {
        await (prisma as any).olxNotificationEvent.create({
          data: {
            accountId: String(account.id),
            notificationId,
            topic,
            createdAtRemote: createdAtRemoteSafe,
            adId,
            listId,
            category,
            status,
            operation,
            reasonTag,
            message,
            viewUrl,
            raw: body,
          },
        });
      } catch {
      }

      if (listId) {
        try {
          await (prisma as any).olxListing.updateMany({
            where: { accountId: String(account.id), listId },
            data: {
              status: status || undefined,
              operation: operation || undefined,
              category: category || undefined,
              olxUrl: viewUrl || undefined,
              lastUpdateAt: new Date(),
            },
          });
        } catch {
        }
      }
    })();

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}
