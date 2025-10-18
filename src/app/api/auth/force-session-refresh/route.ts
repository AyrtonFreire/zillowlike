import { NextResponse } from "next/server";

/**
 * This endpoint forces NextAuth client to refresh the session
 * by returning a specific response that triggers the update
 */
export async function GET() {
  return NextResponse.json(
    {
      message: "Session refresh triggered. Reload the page.",
      action: "Please logout and login again to get fresh session",
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    }
  );
}
