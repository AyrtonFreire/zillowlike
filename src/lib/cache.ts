/**
 * Redis Cache Strategy
 * 
 * Provides caching layer for frequently accessed data:
 * - Featured properties
 * - Property details
 * - Search results (with TTL)
 * - User favorites
 */

import { Redis } from "ioredis";
import { logger } from "./logger";

// Singleton Redis client
let redis: Redis | null = null;

function getRedisClient(): Redis | null {
  if (redis) return redis;

  const redisUrl = process.env.REDIS_URL;
  const redisHost = process.env.REDIS_HOST || "localhost";
  const redisPort = parseInt(process.env.REDIS_PORT || "6379", 10);

  try {
    if (redisUrl) {
      redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          if (times > 3) return null;
          return Math.min(times * 100, 2000);
        },
      });
    } else {
      redis = new Redis({
        host: redisHost,
        port: redisPort,
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          if (times > 3) return null;
          return Math.min(times * 100, 2000);
        },
      });
    }

    redis.on("error", (err) => {
      logger.error({ err }, "Redis connection error");
    });

    redis.on("connect", () => {
      logger.info("Redis cache connected");
    });

    return redis;
  } catch (err) {
    logger.error({ err }, "Failed to initialize Redis cache");
    return null;
  }
}

/**
 * Cache TTLs (in seconds)
 */
export const CacheTTL = {
  FEATURED_PROPERTIES: 5 * 60, // 5 minutes
  PROPERTY_DETAIL: 10 * 60, // 10 minutes
  SEARCH_RESULTS: 2 * 60, // 2 minutes
  USER_FAVORITES: 5 * 60, // 5 minutes
  REALTOR_STATS: 10 * 60, // 10 minutes
  QUEUE_POSITION: 1 * 60, // 1 minute
} as const;

/**
 * Cache key prefixes
 */
export const CacheKey = {
  featuredProperties: () => "cache:featured",
  propertyDetail: (id: string) => `cache:property:${id}`,
  searchResults: (hash: string) => `cache:search:${hash}`,
  userFavorites: (userId: string) => `cache:favorites:${userId}`,
  realtorStats: (realtorId: string) => `cache:realtor:stats:${realtorId}`,
  queuePosition: (realtorId: string) => `cache:queue:position:${realtorId}`,
} as const;

/**
 * Get value from cache
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const client = getRedisClient();
  if (!client) return null;

  try {
    const value = await client.get(key);
    if (!value) return null;

    return JSON.parse(value) as T;
  } catch (err) {
    logger.warn({ err, key }, "Cache get failed");
    return null;
  }
}

/**
 * Set value in cache with TTL
 */
export async function cacheSet(
  key: string,
  value: any,
  ttl: number
): Promise<boolean> {
  const client = getRedisClient();
  if (!client) return false;

  try {
    const serialized = JSON.stringify(value);
    await client.setex(key, ttl, serialized);
    return true;
  } catch (err) {
    logger.warn({ err, key }, "Cache set failed");
    return false;
  }
}

/**
 * Delete key from cache
 */
export async function cacheDel(key: string | string[]): Promise<boolean> {
  const client = getRedisClient();
  if (!client) return false;

  try {
    const keys = Array.isArray(key) ? key : [key];
    await client.del(...keys);
    return true;
  } catch (err) {
    logger.warn({ err, key }, "Cache delete failed");
    return false;
  }
}

/**
 * Invalidate cache by pattern
 */
export async function cacheInvalidatePattern(pattern: string): Promise<number> {
  const client = getRedisClient();
  if (!client) return 0;

  try {
    const keys = await client.keys(pattern);
    if (keys.length === 0) return 0;

    await client.del(...keys);
    logger.info({ pattern, count: keys.length }, "Cache invalidated by pattern");
    return keys.length;
  } catch (err) {
    logger.warn({ err, pattern }, "Cache invalidate pattern failed");
    return 0;
  }
}

/**
 * Wrap a function with caching
 * 
 * @example
 * const getFeatured = withCache(
 *   CacheKey.featuredProperties(),
 *   CacheTTL.FEATURED_PROPERTIES,
 *   async () => await prisma.property.findMany(...)
 * );
 */
export async function withCache<T>(
  key: string,
  ttl: number,
  fn: () => Promise<T>
): Promise<T> {
  // Try cache first
  const cached = await cacheGet<T>(key);
  if (cached !== null) {
    logger.debug({ key }, "Cache hit");
    return cached;
  }

  // Cache miss - execute function
  logger.debug({ key }, "Cache miss");
  const result = await fn();

  // Store in cache (fire and forget)
  cacheSet(key, result, ttl).catch((err) => {
    logger.warn({ err, key }, "Failed to cache result");
  });

  return result;
}

/**
 * Generate cache key hash from object
 */
export function generateCacheHash(obj: Record<string, any>): string {
  const sorted = Object.keys(obj)
    .sort()
    .map((k) => `${k}:${obj[k]}`)
    .join("|");

  // Simple hash (not cryptographic)
  let hash = 0;
  for (let i = 0; i < sorted.length; i++) {
    const char = sorted.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Gracefully close Redis connection
 */
export async function closeCacheConnection(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
    logger.info("Redis cache connection closed");
  }
}
