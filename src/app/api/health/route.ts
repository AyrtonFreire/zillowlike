import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;

    // Check Redis (if configured)
    let redisStatus = "not_configured";
    if (process.env.REDIS_HOST) {
      try {
        const Redis = require("ioredis");
        const redis = new Redis({
          host: process.env.REDIS_HOST || "localhost",
          port: parseInt(process.env.REDIS_PORT || "6379"),
          maxRetriesPerRequest: 1,
          connectTimeout: 2000,
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
