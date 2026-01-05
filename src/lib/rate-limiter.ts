import { RateLimiterMemory, RateLimiterRedis } from "rate-limiter-flexible";
import { Redis } from "ioredis";
import { NextRequest, NextResponse } from "next/server";
import { errorResponse } from "./api-response";

let redisClient: Redis | null = null;

function getRedisClient(): Redis | null {
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return null;
  }

  if (redisClient) return redisClient;

  const redisUrl = process.env.REDIS_URL?.trim();
  const host = process.env.REDIS_HOST?.trim();
  const portStr = process.env.REDIS_PORT?.trim();
  const password = process.env.REDIS_PASSWORD?.trim();

  const hasUrl = !!redisUrl;
  const hasHostPort = !!host && !!portStr;
  if (!hasUrl && !hasHostPort) return null;

  try {
    if (hasUrl) {
      redisClient = new Redis(redisUrl!, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times: number): number | null => {
          if (times > 3) return null;
          return Math.min(times * 100, 2000);
        },
      });
    } else {
      const port = parseInt(portStr!, 10);
      if (!Number.isFinite(port)) return null;
      redisClient = new Redis({
        host: host!,
        port,
        password,
        maxRetriesPerRequest: 3,
        retryStrategy: (times: number): number | null => {
          if (times > 3) return null;
          return Math.min(times * 100, 2000);
        },
      });
    }

    return redisClient;
  } catch {
    redisClient = null;
    return null;
  }
}

function createLimiter(options: { points: number; duration: number; keyPrefix: string }) {
  const redis = getRedisClient();
  if (!redis) {
    return new RateLimiterMemory({ points: options.points, duration: options.duration });
  }

  const insuranceLimiter = new RateLimiterMemory({
    points: options.points,
    duration: options.duration,
  });

  return new RateLimiterRedis({
    storeClient: redis,
    points: options.points,
    duration: options.duration,
    keyPrefix: options.keyPrefix,
    insuranceLimiter,
  });
}

// Rate limiters para diferentes endpoints
const rateLimiters = {
  // 10 requests por minuto por IP (geral)
  default: createLimiter({ points: 10, duration: 60, keyPrefix: "rl:default" }),
  
  // 5 requests por minuto para criar avaliações
  ratings: createLimiter({ points: 5, duration: 60, keyPrefix: "rl:ratings" }),
  
  // 20 requests por minuto para aceitar/rejeitar leads
  leads: createLimiter({ points: 20, duration: 60, keyPrefix: "rl:leads" }),

  ai: createLimiter({ points: 5, duration: 60 * 60, keyPrefix: "rl:ai" }),
};

/**
 * Simple rate limiter class for testing
 */
export class RateLimiter {
  private limiter: RateLimiterMemory;

  constructor(options: { windowMs: number; maxRequests: number }) {
    this.limiter = new RateLimiterMemory({
      points: options.maxRequests,
      duration: options.windowMs / 1000,
    });
  }

  async check(key: string): Promise<boolean> {
    try {
      await this.limiter.consume(key);
      return true;
    } catch {
      return false;
    }
  }

  async checkWithInfo(key: string): Promise<{ allowed: boolean; remaining: number }> {
    try {
      const result = await this.limiter.consume(key);
      return {
        allowed: true,
        remaining: result.remainingPoints,
      };
    } catch (err: any) {
      return {
        allowed: false,
        remaining: 0,
      };
    }
  }
}

/**
 * Checa rate limit para uma chave específica
 */
export async function checkRateLimit(
  key: string,
  limiter: keyof typeof rateLimiters = "default"
): Promise<boolean> {
  try {
    await rateLimiters[limiter].consume(key);
    return true;
  } catch (err: any) {
    if (err && typeof err.msBeforeNext === "number") {
      return false;
    }
    return true;
  }
}

/**
 * Obtém IP do request (considerando proxies)
 */
export function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0] ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

/**
 * Middleware wrapper para aplicar rate limiting
 */
export function withRateLimit<T extends any[], R>(
  handler: (...args: T) => Promise<R>,
  limiter: keyof typeof rateLimiters = "default"
) {
  return async (...args: T): Promise<R | NextResponse> => {
    // Assume que o primeiro argumento é NextRequest
    const request = args[0] as unknown as NextRequest;
    const ip = getClientIp(request);
    
    const allowed = await checkRateLimit(ip, limiter);
    
    if (!allowed) {
      return errorResponse(
        "Too many requests. Please try again later.",
        429,
        null,
        "RATE_LIMIT_EXCEEDED"
      ) as R;
    }
    
    return handler(...args);
  };
}
