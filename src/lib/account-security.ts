import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/token-hash";

export const AUTH_SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;
export const RECENT_REAUTH_TTL_SECONDS = 10 * 60;
export const RECENT_REAUTH_COOKIE_NAME = "oggahub_recent_reauth";

type SessionProvider = "credentials" | "google" | "github" | "unknown" | string;

export type KnownSessionRecord = {
  sessionHash: string;
  createdAt: string;
  provider: string;
  expiresAt: string;
};

function getSigningSecret() {
  return process.env.NEXTAUTH_SECRET || "oggahub-dev-secret";
}

function sanitizeProvider(provider?: string | null) {
  return String(provider || "unknown").replace(/[^a-z0-9_-]/gi, "-").toLowerCase() || "unknown";
}

export function generateSessionKey() {
  return randomBytes(18).toString("hex");
}

export function hashSessionKey(sessionKey: string) {
  return hashToken(String(sessionKey || ""), "account_session");
}

export function buildSessionIdentifier(userId: string, sessionHash: string, createdAtMs: number, provider?: SessionProvider) {
  return `session:${userId}:${sessionHash}:${createdAtMs}:${sanitizeProvider(provider)}`;
}

export function parseSessionIdentifier(identifier: string): KnownSessionRecord | null {
  const parts = String(identifier || "").split(":");
  if (parts.length < 5 || parts[0] !== "session") return null;
  const createdAtMs = Number(parts[3]);
  if (!Number.isFinite(createdAtMs) || createdAtMs <= 0) return null;
  return {
    sessionHash: parts[2],
    createdAt: new Date(createdAtMs).toISOString(),
    provider: parts[4] || "unknown",
    expiresAt: "",
  };
}

export async function createOrRefreshSessionRecord(input: {
  userId: string;
  sessionKey: string;
  provider?: SessionProvider;
  createdAtMs: number;
  expiresAt: Date;
}) {
  const userId = String(input.userId || "").trim();
  const sessionHash = hashSessionKey(input.sessionKey);
  const prefix = `session:${userId}:${sessionHash}:`;
  const existing = await prisma.verificationToken.findFirst({
    where: {
      token: sessionHash,
      identifier: { startsWith: prefix },
    },
    select: { identifier: true },
  });

  if (existing) {
    await prisma.verificationToken.update({
      where: { token: sessionHash },
      data: { expires: input.expiresAt },
    });
    return;
  }

  await prisma.verificationToken.create({
    data: {
      identifier: buildSessionIdentifier(userId, sessionHash, input.createdAtMs, input.provider),
      token: sessionHash,
      expires: input.expiresAt,
    },
  });
}

export async function hasActiveSessionRecord(userId: string, sessionKey: string) {
  const safeUserId = String(userId || "").trim();
  const sessionHash = hashSessionKey(sessionKey);
  const prefix = `session:${safeUserId}:${sessionHash}:`;
  const record = await prisma.verificationToken.findFirst({
    where: {
      token: sessionHash,
      identifier: { startsWith: prefix },
      expires: { gt: new Date() },
    },
    select: { token: true },
  });
  return Boolean(record);
}

export async function revokeSessionRecord(userId: string, sessionHash: string) {
  const safeUserId = String(userId || "").trim();
  const safeSessionHash = String(sessionHash || "").trim();
  if (!safeUserId || !safeSessionHash) return;
  await prisma.verificationToken.deleteMany({
    where: {
      token: safeSessionHash,
      identifier: { startsWith: `session:${safeUserId}:${safeSessionHash}:` },
    },
  });
}

export async function revokeOtherSessionRecords(userId: string, currentSessionKey: string) {
  const safeUserId = String(userId || "").trim();
  const currentHash = hashSessionKey(currentSessionKey);
  await prisma.verificationToken.deleteMany({
    where: {
      identifier: { startsWith: `session:${safeUserId}:` },
      NOT: { token: currentHash },
    },
  });
}

export async function listKnownSessionRecords(userId: string) {
  const safeUserId = String(userId || "").trim();
  const records = await prisma.verificationToken.findMany({
    where: {
      identifier: { startsWith: `session:${safeUserId}:` },
      expires: { gt: new Date() },
    },
    orderBy: { expires: "desc" },
    select: {
      identifier: true,
      expires: true,
    },
  });

  return records
    .map((record) => {
      const parsed = parseSessionIdentifier(record.identifier);
      if (!parsed) return null;
      return {
        ...parsed,
        expiresAt: record.expires.toISOString(),
      };
    })
    .filter(Boolean) as KnownSessionRecord[];
}

export function buildReauthCodeIdentifier(userId: string, sessionKey: string) {
  return `reauth:${String(userId || "").trim()}:${hashSessionKey(sessionKey)}`;
}

function signPayload(payload: string) {
  return createHmac("sha256", getSigningSecret()).update(payload).digest("hex");
}

export function createRecentReauthCookieValue(userId: string, sessionKey: string, expiresAtMs: number) {
  const payload = `${String(userId || "").trim()}:${hashSessionKey(sessionKey)}:${expiresAtMs}`;
  return `${expiresAtMs}.${signPayload(payload)}`;
}

export function verifyRecentReauthCookieValue(cookieValue: string | undefined, userId: string, sessionKey: string) {
  if (!cookieValue) return false;
  const [expiresAtRaw, signature] = String(cookieValue).split(".");
  const expiresAtMs = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAtMs) || expiresAtMs < Date.now() || !signature) {
    return false;
  }
  const payload = `${String(userId || "").trim()}:${hashSessionKey(sessionKey)}:${expiresAtMs}`;
  const expected = signPayload(payload);
  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function getRecentReauthCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

export function requireRecentReauth(req: NextRequest, session: any, message?: string) {
  const userId =
    String(session?.userId || session?.user?.id || session?.user?.sub || "").trim();
  const sessionKey = String(session?.sessionKey || session?.user?.sessionKey || "").trim();
  const cookieValue = req.cookies.get(RECENT_REAUTH_COOKIE_NAME)?.value;

  if (userId && sessionKey && verifyRecentReauthCookieValue(cookieValue, userId, sessionKey)) {
    return null;
  }

  return NextResponse.json(
    {
      error: message || "Confirme sua identidade para concluir esta ação.",
      code: "RECENT_REAUTH_REQUIRED",
    },
    { status: 403 }
  );
}
