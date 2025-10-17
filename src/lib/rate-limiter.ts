import { RateLimiterMemory } from "rate-limiter-flexible";
import { NextRequest, NextResponse } from "next/server";
import { errorResponse } from "./api-response";

// Rate limiters para diferentes endpoints
const rateLimiters = {
  // 10 requests por minuto por IP (geral)
  default: new RateLimiterMemory({
    points: 10,
    duration: 60,
  }),
  
  // 5 requests por minuto para criar avaliações
  ratings: new RateLimiterMemory({
    points: 5,
    duration: 60,
  }),
  
  // 20 requests por minuto para aceitar/rejeitar leads
  leads: new RateLimiterMemory({
    points: 20,
    duration: 60,
  }),
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
  } catch {
    return false;
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
