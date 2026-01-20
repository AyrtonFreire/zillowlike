import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { LeadStatus } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type PipelineStage = "NEW" | "CONTACT" | "VISIT" | "PROPOSAL" | "DOCUMENTS" | "WON" | "LOST";

const jsonSafe = <T,>(value: T): T | number =>
  typeof value === "bigint" ? Number(value) : value;

function clip(s: any, n: number) {
  return String(s || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, n);
}

function base64UrlEncode(input: string) {
  return Buffer.from(input, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(input: string) {
  const normalized = String(input || "")
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const pad = normalized.length % 4 ? "=".repeat(4 - (normalized.length % 4)) : "";
  return Buffer.from(normalized + pad, "base64").toString("utf8");
}

type LeadCursor = {
  hu: number;
  la: string;
  ca: string;
  id: string;
};

function decodeCursor(raw: string | null): LeadCursor | null {
  if (!raw) return null;
  try {
    const decoded = JSON.parse(base64UrlDecode(raw));
    const hu = Number(decoded?.hu ?? 0);
    const la = String(decoded?.la || "");
    const ca = String(decoded?.ca || "");
    const id = String(decoded?.id || "");
    if (!Number.isFinite(hu) || !la || !ca || !id) return null;
    return { hu, la, ca, id };
  } catch {
    return null;
  }
}

function encodeCursor(cur: LeadCursor | null): string | null {
  if (!cur) return null;
  try {
    return base64UrlEncode(JSON.stringify(cur));
  } catch {
    return null;
  }
}

function cursorToLeadId(raw: string | null) {
  const decoded = decodeCursor(raw);
  return decoded?.id ? String(decoded.id) : raw;
}

function pipelineGroupToStages(group: string | null): PipelineStage[] | null {
  const g = String(group || "").toUpperCase();
  if (!g || g === "ALL") return null;
  if (g === "NEW") return ["NEW"];
  if (g === "CONTACT") return ["CONTACT"];
  if (g === "NEGOTIATION") return ["VISIT", "PROPOSAL", "DOCUMENTS"];
  if (g === "CLOSED") return ["WON", "LOST"];
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const session: any = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const userId = session.userId || session.user?.id;
    const role = session.role || session.user?.role;

    if (!userId) {
      return NextResponse.json({ error: "Usuário não encontrado na sessão" }, { status: 400 });
    }

    if (role !== "REALTOR" && role !== "ADMIN") {
      return NextResponse.json({ error: "Você não tem permissão para ver estes leads." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const paged = (searchParams.get("paged") || "").trim() === "1";
    const limitRaw = Number(searchParams.get("limit") || "");
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 100) : 40;
    const cursor = (searchParams.get("cursor") || "").trim() || null;

    const q = (searchParams.get("q") || "").trim();
    const name = (searchParams.get("name") || "").trim();
    const city = (searchParams.get("city") || "").trim();
    const type = (searchParams.get("type") || "").trim();
    const dateFilter = (searchParams.get("date") || "").trim();
    const pipelineGroup = (searchParams.get("group") || "").trim();
    const unreadOnly = (searchParams.get("unread") || "").trim() === "1";
    const includeCompleted = (searchParams.get("includeCompleted") || "").trim() === "1";

    const mapStatusToStage = (status: LeadStatus): PipelineStage => {
      if (status === "ACCEPTED") return "CONTACT";
      if (status === "CONFIRMED") return "VISIT";
      if (status === "COMPLETED") return "WON";
      if (status === "CANCELLED" || status === "EXPIRED" || status === "OWNER_REJECTED") return "LOST";
      return "NEW";
    };

    const isPostgres = /postgres/i.test(process.env.DATABASE_URL || "");
    const decodedCursor = decodeCursor(cursor);
    const stages = pipelineGroupToStages(pipelineGroup);
    const effectiveQuery = q || name;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const createdAtGte = dateFilter === "today" ? today : dateFilter === "last7" ? sevenDaysAgo : null;

    if (paged && isPostgres && (!cursor || decodedCursor)) {
      try {
        const whereSql: Prisma.Sql[] = [Prisma.sql`l."realtorId" = ${String(userId)}`];
        if (!includeCompleted) whereSql.push(Prisma.sql`l.status <> 'COMPLETED'`);
        if (stages && stages.length) {
          whereSql.push(Prisma.sql`l."pipelineStage" IN (${Prisma.join(stages.map((s) => Prisma.sql`${s}`))})`);
        }
        if (createdAtGte) whereSql.push(Prisma.sql`l."createdAt" >= ${createdAtGte}`);
        if (type) whereSql.push(Prisma.sql`p.type = ${type}`);
        if (city) whereSql.push(Prisma.sql`p.city ILIKE ${"%" + city + "%"}`);
        if (effectiveQuery && effectiveQuery.length >= 2) {
          const like = "%" + effectiveQuery + "%";
          whereSql.push(
            Prisma.sql`(
              p.title ILIKE ${like} OR
              p.city ILIKE ${like} OR
              COALESCE(p.neighborhood,'') ILIKE ${like} OR
              c.name ILIKE ${like} OR
              c.email ILIKE ${like} OR
              COALESCE(c.phone,'') ILIKE ${like}
            )`
          );
        }

        const cursorWhere = decodedCursor
          ? Prisma.sql`AND (
              (base.hu < ${decodedCursor.hu}) OR
              (base.hu = ${decodedCursor.hu} AND base.last_activity_at < ${new Date(decodedCursor.la)}) OR
              (base.hu = ${decodedCursor.hu} AND base.last_activity_at = ${new Date(decodedCursor.la)} AND base.created_at < ${new Date(decodedCursor.ca)}) OR
              (base.hu = ${decodedCursor.hu} AND base.last_activity_at = ${new Date(decodedCursor.la)} AND base.created_at = ${new Date(decodedCursor.ca)} AND base.id < ${decodedCursor.id})
            )`
          : Prisma.sql``;

        const unreadWhere = unreadOnly ? Prisma.sql`AND base.has_unread = true` : Prisma.sql``;

        const rows = (await prisma.$queryRaw(
          Prisma.sql`
            WITH lcm AS (
              SELECT
                "leadId",
                MAX("createdAt") AS last_client_at,
                (ARRAY_AGG(content ORDER BY "createdAt" DESC))[1] AS last_client_content
              FROM lead_client_messages
              WHERE "fromClient" = true
              GROUP BY "leadId"
            ),
            lm AS (
              SELECT
                "leadId",
                MAX("createdAt") AS last_internal_at,
                (ARRAY_AGG(content ORDER BY "createdAt" DESC))[1] AS last_internal_content
              FROM lead_messages
              GROUP BY "leadId"
            ),
            base AS (
              SELECT
                l.id,
                l."createdAt" AS created_at,
                GREATEST(
                  l."createdAt",
                  COALESCE(lcm.last_client_at, l."createdAt"),
                  COALESCE(lm.last_internal_at, l."createdAt")
                ) AS last_activity_at,
                CASE
                  WHEN lcm.last_client_at IS NULL THEN false
                  WHEN lm.last_internal_at IS NULL THEN true
                  WHEN lcm.last_client_at > lm.last_internal_at THEN true
                  ELSE false
                END AS last_from_client,
                CASE
                  WHEN (
                    CASE
                      WHEN lcm.last_client_at IS NULL THEN false
                      WHEN lm.last_internal_at IS NULL THEN true
                      WHEN lcm.last_client_at > lm.last_internal_at THEN true
                      ELSE false
                    END
                  ) = true AND (
                    rr."lastReadAt" IS NULL OR lcm.last_client_at > rr."lastReadAt"
                  ) THEN true
                  ELSE false
                END AS has_unread,
                CASE
                  WHEN (
                    CASE
                      WHEN lcm.last_client_at IS NULL THEN false
                      WHEN lm.last_internal_at IS NULL THEN true
                      WHEN lcm.last_client_at > lm.last_internal_at THEN true
                      ELSE false
                    END
                  ) = true THEN lcm.last_client_content
                  ELSE lm.last_internal_content
                END AS last_preview,
                CASE WHEN (
                  CASE
                    WHEN (
                      CASE
                        WHEN lcm.last_client_at IS NULL THEN false
                        WHEN lm.last_internal_at IS NULL THEN true
                        WHEN lcm.last_client_at > lm.last_internal_at THEN true
                        ELSE false
                      END
                    ) = true AND (
                      rr."lastReadAt" IS NULL OR lcm.last_client_at > rr."lastReadAt"
                    ) THEN true
                    ELSE false
                  END
                ) THEN 1 ELSE 0 END AS hu
              FROM leads l
              JOIN properties p ON p.id = l."propertyId"
              LEFT JOIN contacts c ON c.id = l."contactId"
              LEFT JOIN lcm ON lcm."leadId" = l.id
              LEFT JOIN lm ON lm."leadId" = l.id
              LEFT JOIN lead_chat_read_receipts rr ON rr."leadId" = l.id AND rr."userId" = ${String(userId)}
              WHERE ${Prisma.join(whereSql, " AND ")}
            )
            SELECT
              base.id,
              base.created_at,
              base.last_activity_at,
              base.has_unread,
              base.last_preview,
              base.last_from_client,
              base.hu
            FROM base
            WHERE true
            ${unreadWhere}
            ${cursorWhere}
            ORDER BY base.hu DESC, base.last_activity_at DESC, base.created_at DESC, base.id DESC
            LIMIT ${limit + 1}
          `
        )) as any[];

        const slice = rows.slice(0, limit);
        const hasMore = rows.length > limit;
        const leadIds = slice.map((r) => String(r.id));

        const leads = await (prisma as any).lead.findMany({
          where: { id: { in: leadIds } },
          include: {
            property: {
              select: {
                id: true,
                title: true,
                price: true,
                type: true,
                city: true,
                state: true,
                neighborhood: true,
                street: true,
                bedrooms: true,
                bathrooms: true,
                areaM2: true,
                builtAreaM2: true,
                usableAreaM2: true,
                lotAreaM2: true,
                privateAreaM2: true,
                suites: true,
                parkingSpots: true,
                floor: true,
                furnished: true,
                petFriendly: true,
                condoFee: true,
                purpose: true,
                images: {
                  take: 1,
                  orderBy: { sortOrder: "asc" },
                },
              },
            },
            contact: {
              select: {
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        });

        const leadById = new Map<string, any>((leads as any[]).map((lead) => [String(lead.id), lead]));
        const orderedLeads = leadIds.map((id) => leadById.get(String(id))).filter(Boolean);

        const rowById = new Map<string, any>(slice.map((r) => [String(r.id), r]));

        const normalized = (orderedLeads as any[]).map((lead) => {
          const row = rowById.get(String(lead.id)) || null;
          const lastActivityAt = row?.last_activity_at ? new Date(row.last_activity_at).toISOString() : null;
          return {
            ...lead,
            pipelineStage: lead.pipelineStage || mapStatusToStage(lead.status),
            hasUnreadMessages: !!row?.has_unread,
            lastMessageAt: lastActivityAt,
            lastMessagePreview: row?.last_preview ? clip(row.last_preview, 90) : null,
            lastMessageFromClient: !!row?.last_from_client,
            lastContactAt: lastActivityAt,
            property: lead.property
              ? {
                  ...lead.property,
                  price: jsonSafe(lead.property.price),
                  condoFee: jsonSafe(lead.property.condoFee),
                }
              : lead.property,
          };
        });

        const lastRow = slice.length ? slice[slice.length - 1] : null;
        const nextCursor = hasMore
          ? encodeCursor({
              hu: Number(lastRow?.hu || 0),
              la: new Date(lastRow.last_activity_at).toISOString(),
              ca: new Date(lastRow.created_at).toISOString(),
              id: String(lastRow.id),
            })
          : null;

        return NextResponse.json({ items: normalized, nextCursor });
      } catch (err) {
        console.error("Error in optimized my-leads query:", err);
      }
    }

    const leadWhere: any = {
      realtorId: userId,
      ...(includeCompleted ? {} : { status: { not: "COMPLETED" } }),
      ...(createdAtGte ? { createdAt: { gte: createdAtGte } } : {}),
      ...(stages && stages.length ? { pipelineStage: { in: stages } } : {}),
      ...(type || city || effectiveQuery
        ? {
            property: {
              ...(type ? { type } : {}),
              ...(city ? { city: { contains: city, mode: "insensitive" } } : {}),
              ...(effectiveQuery && effectiveQuery.length >= 2
                ? {
                    OR: [
                      { title: { contains: effectiveQuery, mode: "insensitive" } },
                      { city: { contains: effectiveQuery, mode: "insensitive" } },
                      { neighborhood: { contains: effectiveQuery, mode: "insensitive" } },
                    ],
                  }
                : {}),
            },
          }
        : {}),
      ...(effectiveQuery && effectiveQuery.length >= 2
        ? {
            OR: [
              { contact: { name: { contains: effectiveQuery, mode: "insensitive" } } },
              { contact: { email: { contains: effectiveQuery, mode: "insensitive" } } },
              { contact: { phone: { contains: effectiveQuery, mode: "insensitive" } } },
            ],
          }
        : {}),
    };

    const leadIndex = await (prisma as any).lead.findMany({
      where: leadWhere,
      select: {
        id: true,
        createdAt: true,
      },
    });

    const allLeadIds = (leadIndex as any[]).map((l) => String(l.id));

    const [lastClientAgg, lastInternalAgg] = await Promise.all([
      allLeadIds.length
        ? (prisma as any).leadClientMessage.groupBy({
            by: ["leadId"],
            where: { lead: { realtorId: String(userId) } },
            _max: { createdAt: true },
          })
        : Promise.resolve([] as any[]),
      allLeadIds.length
        ? (prisma as any).leadMessage.groupBy({
            by: ["leadId"],
            where: { lead: { realtorId: String(userId) } },
            _max: { createdAt: true },
          })
        : Promise.resolve([] as any[]),
    ]);

    const lastClientAtByLead = new Map<string, Date>();
    for (const row of lastClientAgg as any[]) {
      if (!row?._max?.createdAt) continue;
      lastClientAtByLead.set(String(row.leadId), new Date(row._max.createdAt));
    }

    const lastInternalAtByLead = new Map<string, Date>();
    for (const row of lastInternalAgg as any[]) {
      if (!row?._max?.createdAt) continue;
      lastInternalAtByLead.set(String(row.leadId), new Date(row._max.createdAt));
    }

    let readReceipts: any[] = [];
    try {
      readReceipts = allLeadIds.length
        ? await (prisma as any).leadChatReadReceipt.findMany({
            where: { userId: String(userId), leadId: { in: allLeadIds } },
            select: { leadId: true, lastReadAt: true },
          })
        : [];
    } catch (err: any) {
      if (err?.code === "P2021") {
        readReceipts = [];
      } else {
        throw err;
      }
    }
    const readMap = new Map<string, Date>(
      (readReceipts || []).map((r: any) => [String(r.leadId), new Date(r.lastReadAt)])
    );

    const orderedLeadIds = (leadIndex as any[])
      .map((lead) => {
        const leadId = String(lead.id);
        const createdAt = new Date(lead.createdAt);
        const clientAt = lastClientAtByLead.get(leadId) || null;
        const internalAt = lastInternalAtByLead.get(leadId) || null;

        let lastMessageAt = createdAt;
        let lastMessageFromClient = false;
        if (clientAt && internalAt) {
          if (clientAt.getTime() > internalAt.getTime()) {
            lastMessageAt = clientAt;
            lastMessageFromClient = true;
          } else {
            lastMessageAt = internalAt;
          }
        } else if (clientAt) {
          lastMessageAt = clientAt;
          lastMessageFromClient = true;
        } else if (internalAt) {
          lastMessageAt = internalAt;
        }

        let hasUnreadMessages = false;
        if (lastMessageFromClient && clientAt) {
          const lastReadAt = readMap.get(leadId) || null;
          if (!lastReadAt) {
            hasUnreadMessages = true;
          } else {
            const a = lastReadAt.getTime();
            const b = clientAt.getTime();
            if (!Number.isNaN(a) && !Number.isNaN(b) && b > a) {
              hasUnreadMessages = true;
            }
          }
        }

        return {
          id: leadId,
          createdAt,
          lastMessageAt,
          hasUnreadMessages,
        };
      })
      .filter((row) => {
        if (!unreadOnly) return true;
        return !!row.hasUnreadMessages;
      })
      .sort((a, b) => {
        if (a.hasUnreadMessages !== b.hasUnreadMessages) {
          return a.hasUnreadMessages ? -1 : 1;
        }
        const aTime = a.lastMessageAt?.getTime() || 0;
        const bTime = b.lastMessageAt?.getTime() || 0;
        if (aTime !== bTime) return bTime - aTime;
        return b.createdAt.getTime() - a.createdAt.getTime();
      })
      .map((row) => row.id);

    const startIndex = cursor ? Math.max(orderedLeadIds.indexOf(String(cursorToLeadId(cursor))) + 1, 0) : 0;
    const pageLeadIds = orderedLeadIds.slice(startIndex, startIndex + limit);
    const pagedNextCursor = pageLeadIds.length === limit ? pageLeadIds[pageLeadIds.length - 1] : null;

    const leads = await (prisma as any).lead.findMany({
      where: {
        id: { in: pageLeadIds },
      },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            price: true,
            type: true,
            city: true,
            state: true,
            neighborhood: true,
            street: true,
            bedrooms: true,
            bathrooms: true,
            areaM2: true,
            builtAreaM2: true,
            usableAreaM2: true,
            lotAreaM2: true,
            privateAreaM2: true,
            suites: true,
            parkingSpots: true,
            floor: true,
            furnished: true,
            petFriendly: true,
            condoFee: true,
            purpose: true,
            images: {
              take: 1,
              orderBy: { sortOrder: "asc" },
            },
          },
        },
        contact: {
          select: {
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    const leadById = new Map<string, any>((leads as any[]).map((lead) => [String(lead.id), lead]));
    const orderedLeads = pageLeadIds.map((id) => leadById.get(String(id))).filter(Boolean);

    const leadIds = orderedLeads.map((l) => String(l.id));

    const [lastClientMsgs, lastInternalMsgs] = await Promise.all([
      leadIds.length
        ? (prisma as any).leadClientMessage.findMany({
            where: { leadId: { in: leadIds } },
            orderBy: { createdAt: "desc" },
            take: 2500,
            select: { leadId: true, createdAt: true, content: true, fromClient: true },
          })
        : Promise.resolve([] as any[]),
      leadIds.length
        ? (prisma as any).leadMessage.findMany({
            where: { leadId: { in: leadIds } },
            orderBy: { createdAt: "desc" },
            take: 2500,
            select: { leadId: true, createdAt: true, content: true },
          })
        : Promise.resolve([] as any[]),
    ]);


    const lastClientByLead = new Map<string, any>();
    for (const m of lastClientMsgs as any[]) {
      const k = String(m.leadId);
      if (!lastClientByLead.has(k)) lastClientByLead.set(k, m);
    }

    const lastInternalByLead = new Map<string, any>();
    for (const m of lastInternalMsgs as any[]) {
      const k = String(m.leadId);
      if (!lastInternalByLead.has(k)) lastInternalByLead.set(k, m);
    }

    const normalized = (orderedLeads as any[]).map((lead) => {
      const leadId = String(lead.id);
      const lastClient = lastClientByLead.get(leadId) || null;
      const lastInternal = lastInternalByLead.get(leadId) || null;

      const clientAt = lastClient?.createdAt ? new Date(lastClient.createdAt) : null;
      const internalAt = lastInternal?.createdAt ? new Date(lastInternal.createdAt) : null;

      let lastMessageAt: Date | null = null;
      let lastMessagePreview: string | null = null;
      let lastMessageFromClient = false;

      if (clientAt && internalAt) {
        if (clientAt.getTime() > internalAt.getTime()) {
          lastMessageAt = clientAt;
          lastMessagePreview = clip(lastClient?.content, 90) || null;
          lastMessageFromClient = !!lastClient?.fromClient;
        } else {
          lastMessageAt = internalAt;
          lastMessagePreview = clip(lastInternal?.content, 90) || null;
          lastMessageFromClient = false;
        }
      } else if (clientAt) {
        lastMessageAt = clientAt;
        lastMessagePreview = clip(lastClient?.content, 90) || null;
        lastMessageFromClient = !!lastClient?.fromClient;
      } else if (internalAt) {
        lastMessageAt = internalAt;
        lastMessagePreview = clip(lastInternal?.content, 90) || null;
        lastMessageFromClient = false;
      }

      let hasUnreadMessages = false;
      if (lastMessageFromClient && lastMessageAt) {
        const lastReadAt = readMap.get(leadId) || null;
        if (!lastReadAt) {
          hasUnreadMessages = true;
        } else {
          const a = lastReadAt.getTime();
          const b = lastMessageAt.getTime();
          if (!Number.isNaN(a) && !Number.isNaN(b) && b > a) {
            hasUnreadMessages = true;
          }
        }
      }

      return {
        ...lead,
        pipelineStage: lead.pipelineStage || mapStatusToStage(lead.status),
        hasUnreadMessages,
        lastMessageAt: lastMessageAt ? lastMessageAt.toISOString() : null,
        lastMessagePreview,
        lastMessageFromClient,
        lastContactAt: lastMessageAt ? lastMessageAt.toISOString() : null,
        property: lead.property
          ? {
              ...lead.property,
              price: jsonSafe(lead.property.price),
              condoFee: jsonSafe(lead.property.condoFee),
            }
          : lead.property,
      };
    });

    if (!paged) {
      const sorted = [...normalized].sort((a: any, b: any) => {
        const au = a.hasUnreadMessages ? 1 : 0;
        const bu = b.hasUnreadMessages ? 1 : 0;
        if (au !== bu) return bu - au;
        const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : new Date(a.createdAt).getTime();
        const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : new Date(b.createdAt).getTime();
        if (!Number.isNaN(aTime) && !Number.isNaN(bTime) && aTime !== bTime) {
          return bTime - aTime;
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      return NextResponse.json(sorted);
    }

    return NextResponse.json({ items: normalized, nextCursor: pagedNextCursor || null });
  } catch (error) {
    console.error("Error getting my leads:", error);
    return NextResponse.json(
      { error: "Não conseguimos carregar seus leads agora." },
      { status: 500 }
    );
  }
}
