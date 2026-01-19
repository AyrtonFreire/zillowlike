import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;

    // Check Redis (if configured)
    let redisStatus = "not_configured";
    const isBuild = process.env.NEXT_PHASE === "phase-production-build";
    const hasUrl = !!process.env.REDIS_URL;
    const hasHostPort = !!process.env.REDIS_HOST && !!process.env.REDIS_PORT;

    if (!isBuild && (hasUrl || hasHostPort)) {
      try {
        const Redis = require("ioredis");
        const redis = hasUrl
          ? new Redis(process.env.REDIS_URL as string, {
              enableOfflineQueue: false,
              maxRetriesPerRequest: 1,
              connectTimeout: 2000,
            })
          : new Redis({
              host: process.env.REDIS_HOST as string,
              port: parseInt(process.env.REDIS_PORT as string, 10),
              enableOfflineQueue: false,
              maxRetriesPerRequest: 1,
              connectTimeout: 2000,
            });
        redis.on("error", () => {
          // swallow - health endpoint reports unhealthy
        });
        await redis.ping();
        redis.disconnect();
        redisStatus = "healthy";
      } catch (error) {
        redisStatus = "unhealthy";
      }
    }

    return NextResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      services: {
        database: "healthy",
        redis: redisStatus,
      },
      version: process.env.npm_package_version || "unknown",
      uptime: process.uptime(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 503 }
    );
  }
}

// Readiness check (for Kubernetes)
export async function HEAD() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return new NextResponse(null, { status: 200 });
  } catch {
    return new NextResponse(null, { status: 503 });
  }
}
