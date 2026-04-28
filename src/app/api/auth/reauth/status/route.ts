import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  RECENT_REAUTH_COOKIE_NAME,
  verifyRecentReauthCookieValue,
} from "@/lib/account-security";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ verified: false }, { status: 401 });
    }

    const userId = (session as any)?.userId || (session as any)?.user?.id || (session as any)?.user?.sub;
    const sessionKey = (session as any)?.sessionKey || (session as any)?.user?.sessionKey;
    if (!userId || !sessionKey) {
      return NextResponse.json({ verified: false }, { status: 401 });
    }

    const cookieValue = req.cookies.get(RECENT_REAUTH_COOKIE_NAME)?.value;
    const verified = verifyRecentReauthCookieValue(cookieValue, String(userId), String(sessionKey));
    const expiresAtRaw = String(cookieValue || "").split(".")[0];
    const expiresAtMs = Number(expiresAtRaw);

    const user = await prisma.user.findUnique({
      where: { id: String(userId) },
      select: {
        email: true,
        passwordHash: true,
      },
    });

    return NextResponse.json({
      verified,
      expiresAt: verified && Number.isFinite(expiresAtMs) ? new Date(expiresAtMs).toISOString() : null,
      hasPassword: Boolean((user as any)?.passwordHash),
      email: user?.email || null,
    });
  } catch (error) {
    console.error("/api/auth/reauth/status error", error);
    return NextResponse.json({ verified: false, hasPassword: false, email: null, expiresAt: null }, { status: 500 });
  }
}
