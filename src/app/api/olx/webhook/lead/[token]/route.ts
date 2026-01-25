import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";
import { LeadDistributionService } from "@/lib/lead-distribution-service";
import { LeadEventService } from "@/lib/lead-event-service";

function responseId() {
  return randomBytes(12).toString("hex");
}

export async function POST(req: NextRequest, context: { params: Promise<{ token: string }> }) {
  const rid = responseId();
  try {
    const { token } = await context.params;

    const account: any = await (prisma as any).olxAccount.findUnique({
      where: { webhookToken: String(token) },
      select: {
        id: true,
        webhookToken: true,
        leadConfigToken: true,
      },
    });

    if (!account?.id) {
      return NextResponse.json({ responseId: rid }, { status: 404 });
    }

    const body: any = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ responseId: rid }, { status: 200 });
    }

    const leadTokenHeader = (req.headers.get("x-olx-token") || "").trim();
    const authHeader = (req.headers.get("authorization") || "").trim();
    const bearer = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : "";
    const expected = String(account.leadConfigToken || account.webhookToken || "").trim();
    const provided = leadTokenHeader || bearer;
    if (expected && provided !== expected) {
      return NextResponse.json({ responseId: rid }, { status: 401 });
    }

    void (async () => {
      const createdAtRemote = body.createdAt ? new Date(String(body.createdAt)) : null;
      const listId = body.listId != null ? String(body.listId) : null;

      let internalLeadId: string | null = null;

      try {
        if (listId) {
          const listing: any = await (prisma as any).olxListing.findFirst({
            where: { accountId: String(account.id), listId },
            select: { propertyId: true },
          });

          if (listing?.propertyId) {
            const property: any = await (prisma as any).property.findUnique({
              where: { id: String(listing.propertyId) },
              select: { id: true, teamId: true },
            });

            if (property?.id) {
              const email = String(body.email || "").trim().toLowerCase();
              const name = String(body.name || "").trim() || "Cliente";
              const phone = body.phone ? String(body.phone).trim() : null;

              let contact = null as any;
              if (email) {
                contact = await (prisma as any).contact.findFirst({ where: { email } });
              }
              if (!contact) {
                contact = await (prisma as any).contact.create({
                  data: {
                    name,
                    email: email || `${rid}@olx.local`,
                    phone: phone || null,
                  },
                });
              }

              const lead = await (prisma as any).lead.create({
                data: {
                  propertyId: String(property.id),
                  contactId: String(contact.id),
                  message: body.message ? String(body.message) : null,
                  isDirect: false,
                  teamId: property.teamId ? String(property.teamId) : undefined,
                  status: "PENDING",
                },
                select: { id: true },
              });

              internalLeadId = String(lead.id);

              if (body.message && String(body.message).trim().length > 0) {
                try {
                  await (prisma as any).leadClientMessage.create({
                    data: {
                      leadId: internalLeadId,
                      fromClient: true,
                      content: String(body.message),
                    },
                    select: { id: true },
                  });
                } catch {
                }
              }

              await LeadEventService.record({
                leadId: internalLeadId,
                type: "LEAD_CREATED",
                title: "Lead recebido da OLX",
                description: body.message ? String(body.message) : null,
                metadata: {
                  source: "OLX",
                  listId,
                  adId: body.adId != null ? String(body.adId) : null,
                },
              });

              try {
                await LeadDistributionService.distributeNewLead(internalLeadId);
              } catch {
              }
            }
          }
        }
      } catch {
      }

      try {
        await (prisma as any).olxLeadEvent.create({
          data: {
            accountId: String(account.id),
            externalId: body.externalId != null ? String(body.externalId) : null,
            adId: body.adId != null ? String(body.adId) : null,
            listId,
            linkAd: body.linkAd != null ? String(body.linkAd) : null,
            source: body.source != null ? String(body.source) : null,
            name: body.name != null ? String(body.name) : null,
            email: body.email != null ? String(body.email) : null,
            phone: body.phone != null ? String(body.phone) : null,
            message: body.message != null ? String(body.message) : null,
            createdAtRemote:
              createdAtRemote && !Number.isNaN(createdAtRemote.getTime()) ? createdAtRemote : null,
            internalLeadId,
            raw: body,
          },
        });
      } catch {
      }
    })();

    return NextResponse.json({ responseId: rid }, { status: 200 });
  } catch {
    return NextResponse.json({ responseId: rid }, { status: 200 });
  }
}
