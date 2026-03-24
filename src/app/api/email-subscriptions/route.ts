import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  EmailPreferenceUpdateSchema,
  PublicEmailSubscriptionSchema,
  getSiteBaseUrl,
  normalizeEmail,
  normalizeInterests,
} from "@/lib/communication-preferences";
import { getEmailSubscriptionWelcomeEmail, sendEmail } from "@/lib/email";

const AuthenticatedPreferenceSchema = EmailPreferenceUpdateSchema.extend({
  savedSearchesEnabled: z.boolean().optional(),
  savedSearchFrequency: z.enum(["INSTANT", "DAILY", "WEEKLY"]).optional(),
});

function getSessionIdentity(session: any) {
  return {
    userId: session?.userId || session?.user?.id || session?.user?.sub || null,
    email: session?.user?.email ? String(session.user.email).trim() : "",
    name: session?.user?.name ? String(session.user.name).trim() : "",
  };
}

async function loadSubscriptionContext(userId: string, email: string) {
  const normalizedEmail = normalizeEmail(email);
  const subscription = await (prisma as any).emailSubscription.findFirst({
    where: {
      OR: [
        { userId },
        ...(normalizedEmail ? [{ normalizedEmail }] : []),
      ],
    },
    orderBy: [{ userId: "desc" }, { updatedAt: "desc" }],
  });

  const savedSearches = await (prisma as any).savedSearch.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      label: true,
      params: true,
      frequency: true,
      alertsEnabled: true,
      lastAlertSentAt: true,
      createdAt: true,
    },
  });

  return { subscription, savedSearches };
}

function serializeContext(subscription: any, savedSearches: any[], fallbackEmail: string) {
  const activeAlerts = savedSearches.filter((item) => item.alertsEnabled).length;
  return {
    subscription: subscription
      ? {
          id: subscription.id,
          email: subscription.email,
          status: subscription.status,
          frequency: subscription.frequency,
          city: subscription.city,
          state: subscription.state,
          interests: subscription.interests,
          subscribedToAlerts: subscription.subscribedToAlerts,
          subscribedToDigest: subscription.subscribedToDigest,
          subscribedToGuides: subscription.subscribedToGuides,
          subscribedToPriceDrops: subscription.subscribedToPriceDrops,
          updatedAt: subscription.updatedAt,
        }
      : fallbackEmail
        ? {
            id: null,
            email: fallbackEmail,
            status: "ACTIVE",
            frequency: "WEEKLY",
            city: null,
            state: null,
            interests: ["BUY"],
            subscribedToAlerts: activeAlerts > 0,
            subscribedToDigest: true,
            subscribedToGuides: true,
            subscribedToPriceDrops: false,
            updatedAt: null,
          }
        : null,
    savedSearches,
    summary: {
      totalSavedSearches: savedSearches.length,
      activeAlerts,
      inactiveAlerts: savedSearches.length - activeAlerts,
    },
  };
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const identity = getSessionIdentity(session);
    if (!identity.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { subscription, savedSearches } = await loadSubscriptionContext(identity.userId, identity.email);
    return NextResponse.json({
      success: true,
      ...serializeContext(subscription, savedSearches, identity.email),
    });
  } catch (error) {
    console.error("Error loading email subscriptions:", error);
    return NextResponse.json({ error: "Failed to load email preferences" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions).catch(() => null);
    const identity = getSessionIdentity(session);
    const body = await req.json();
    const parsed = PublicEmailSubscriptionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data", issues: parsed.error.issues }, { status: 400 });
    }

    const normalizedEmail = normalizeEmail(parsed.data.email);
    const interests = normalizeInterests(parsed.data.interests);
    const linkedUserId = identity.userId && normalizeEmail(identity.email) === normalizedEmail ? identity.userId : null;

    const subscription = await (prisma as any).emailSubscription.upsert({
      where: { normalizedEmail },
      update: {
        email: parsed.data.email,
        normalizedEmail,
        userId: linkedUserId,
        source: parsed.data.source,
        status: "ACTIVE",
        frequency: parsed.data.frequency,
        city: parsed.data.city || null,
        state: parsed.data.state || null,
        interests,
        subscribedToAlerts: parsed.data.subscribedToAlerts,
        subscribedToDigest: parsed.data.subscribedToDigest,
        subscribedToGuides: parsed.data.subscribedToGuides,
        subscribedToPriceDrops: parsed.data.subscribedToPriceDrops,
        consentedAt: new Date(),
        unsubscribedAt: null,
      },
      create: {
        email: parsed.data.email,
        normalizedEmail,
        userId: linkedUserId,
        source: parsed.data.source,
        status: "ACTIVE",
        frequency: parsed.data.frequency,
        city: parsed.data.city || null,
        state: parsed.data.state || null,
        interests,
        subscribedToAlerts: parsed.data.subscribedToAlerts,
        subscribedToDigest: parsed.data.subscribedToDigest,
        subscribedToGuides: parsed.data.subscribedToGuides,
        subscribedToPriceDrops: parsed.data.subscribedToPriceDrops,
        consentedAt: new Date(),
      },
    });

    const siteUrl = getSiteBaseUrl();
    const { subject, html } = getEmailSubscriptionWelcomeEmail({
      email: parsed.data.email,
      name: identity.name || null,
      interests,
      frequency: subscription.frequency,
      city: subscription.city,
      state: subscription.state,
      preferencesUrl: linkedUserId ? `${siteUrl}/account/communication` : `${siteUrl}/privacidade`,
    });
    await sendEmail({ to: parsed.data.email, subject, html });

    return NextResponse.json({
      success: true,
      subscription: {
        id: subscription.id,
        email: subscription.email,
        frequency: subscription.frequency,
        interests: subscription.interests,
        city: subscription.city,
        state: subscription.state,
      },
    });
  } catch (error) {
    console.error("Error creating email subscription:", error);
    return NextResponse.json({ error: "Failed to save subscription" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const identity = getSessionIdentity(session);
    if (!identity.userId || !identity.email) {
      return NextResponse.json({ error: "Email da conta é obrigatório para gerenciar preferências." }, { status: 400 });
    }

    const body = await req.json();
    const parsed = AuthenticatedPreferenceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data", issues: parsed.error.issues }, { status: 400 });
    }

    const normalizedEmail = normalizeEmail(identity.email);
    const existing = await (prisma as any).emailSubscription.findFirst({
      where: {
        OR: [{ userId: identity.userId }, { normalizedEmail }],
      },
      orderBy: [{ userId: "desc" }, { updatedAt: "desc" }],
    });

    const interests = parsed.data.interests ? normalizeInterests(parsed.data.interests) : existing?.interests || ["BUY"];
    const nextStatus = parsed.data.status || existing?.status || "ACTIVE";

    const subscription = existing
      ? await (prisma as any).emailSubscription.update({
          where: { id: existing.id },
          data: {
            email: identity.email,
            normalizedEmail,
            userId: identity.userId,
            city: typeof parsed.data.city === "undefined" ? existing.city : parsed.data.city || null,
            state: typeof parsed.data.state === "undefined" ? existing.state : parsed.data.state || null,
            interests,
            frequency: parsed.data.frequency || existing.frequency,
            status: nextStatus,
            subscribedToAlerts: parsed.data.subscribedToAlerts ?? existing.subscribedToAlerts,
            subscribedToDigest: parsed.data.subscribedToDigest ?? existing.subscribedToDigest,
            subscribedToGuides: parsed.data.subscribedToGuides ?? existing.subscribedToGuides,
            subscribedToPriceDrops: parsed.data.subscribedToPriceDrops ?? existing.subscribedToPriceDrops,
            unsubscribedAt: nextStatus === "UNSUBSCRIBED" ? new Date() : null,
          },
        })
      : await (prisma as any).emailSubscription.create({
          data: {
            email: identity.email,
            normalizedEmail,
            userId: identity.userId,
            city: parsed.data.city || null,
            state: parsed.data.state || null,
            interests,
            frequency: parsed.data.frequency || "WEEKLY",
            status: nextStatus,
            subscribedToAlerts: parsed.data.subscribedToAlerts ?? true,
            subscribedToDigest: parsed.data.subscribedToDigest ?? true,
            subscribedToGuides: parsed.data.subscribedToGuides ?? true,
            subscribedToPriceDrops: parsed.data.subscribedToPriceDrops ?? false,
            unsubscribedAt: nextStatus === "UNSUBSCRIBED" ? new Date() : null,
          },
        });

    if (typeof parsed.data.savedSearchesEnabled !== "undefined" || parsed.data.savedSearchFrequency) {
      await (prisma as any).savedSearch.updateMany({
        where: { userId: identity.userId },
        data: {
          ...(typeof parsed.data.savedSearchesEnabled !== "undefined" ? { alertsEnabled: parsed.data.savedSearchesEnabled } : {}),
          ...(parsed.data.savedSearchFrequency ? { frequency: parsed.data.savedSearchFrequency } : {}),
        },
      });
    }

    const { savedSearches } = await loadSubscriptionContext(identity.userId, identity.email);
    return NextResponse.json({
      success: true,
      ...serializeContext(subscription, savedSearches, identity.email),
    });
  } catch (error) {
    console.error("Error updating email preferences:", error);
    return NextResponse.json({ error: "Failed to update email preferences" }, { status: 500 });
  }
}
