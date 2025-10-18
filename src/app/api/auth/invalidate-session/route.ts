import { NextResponse } from "next/server";
import { cookies } from "next/headers";

/**
 * Force invalidate all NextAuth cookies
 * This will force the user to get a new JWT token on next request
 */
export async function POST() {
  try {
    const cookieStore = await cookies();
    
    // Delete all NextAuth cookies
    const authCookies = [
      "next-auth.session-token",
      "__Secure-next-auth.session-token",
      "next-auth.csrf-token",
      "__Host-next-auth.csrf-token",
      "next-auth.callback-url",
      "__Secure-next-auth.callback-url",
    ];
    
    authCookies.forEach(cookieName => {
      try {
        cookieStore.delete(cookieName);
      } catch (e) {
        // Cookie might not exist
      }
    });
    
    return NextResponse.json({
      success: true,
      message: "All auth cookies deleted. Please login again.",
    });
  } catch (error) {
    console.error("Error invalidating session:", error);
    return NextResponse.json(
      { error: "Failed to invalidate session" },
      { status: 500 }
    );
  }
}
