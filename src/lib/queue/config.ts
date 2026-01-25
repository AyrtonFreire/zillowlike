import { ConnectionOptions } from "bullmq";
import { Redis } from "ioredis";

/**
 * Obtém a configuração de conexão Redis para BullMQ de forma segura.
 * - Não usa fallback para localhost em produção/build
 * - Retorna null quando não configurado (desabilita filas)
 * - Não inicializa durante o build da Vercel
 */
let bullRedisClient: Redis | null = null;

export function getRedisConnection(): ConnectionOptions | Redis | null {
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return null;
  }

  const redisUrl = process.env.REDIS_URL?.trim();
  const host = process.env.REDIS_HOST?.trim();
  const portStr = process.env.REDIS_PORT?.trim();
  const password = process.env.REDIS_PASSWORD?.trim();

  const isProdRuntime = process.env.NODE_ENV === "production" || !!process.env.VERCEL;
  const isLocalHost = !!host && (host === "127.0.0.1" || host === "localhost" || host === "::1");
  if (isProdRuntime && isLocalHost) {
    return null;
  }

  const parseRedisUrl = (urlStr: string): ConnectionOptions | null => {
    try {
      const u = new URL(urlStr);
      const protocol = String(u.protocol || "").toLowerCase();
      if (protocol !== "redis:" && protocol !== "rediss:") return null;
      const h = u.hostname;
      const p = u.port ? parseInt(u.port, 10) : 6379;
      if (!h || !Number.isFinite(p)) return null;
      const pass = u.password ? decodeURIComponent(u.password) : undefined;
      const isTls = protocol === "rediss:";
      const isLocal = h === "127.0.0.1" || h === "localhost" || h === "::1";
      if (isProdRuntime && isLocal) return null;
      return {
        host: h,
        port: p,
        password: pass,
        ...(isTls ? { tls: {} } : {}),
      } as any;
    } catch {
      return null;
    }
  };

  const urlConn = redisUrl ? parseRedisUrl(redisUrl) : null;

  if (!urlConn && (!host || !portStr)) {
    return null;
  }

  const port = urlConn ? (urlConn as any).port : parseInt(portStr as string, 10);
  if (!Number.isFinite(port)) return null;

  if (bullRedisClient) return bullRedisClient;

  const client = new Redis({
    host: urlConn ? (urlConn as any).host : (host as string),
    port,
    password: urlConn ? (urlConn as any).password : password,
    ...(urlConn && (urlConn as any).tls ? { tls: (urlConn as any).tls } : {}),
    maxRetriesPerRequest: null, // Recomendado para BullMQ
    enableOfflineQueue: false,
    retryStrategy: (times: number): number | null => {
      if (times > 3) return null;
      return Math.min(times * 100, 2000);
    },
  });

  // Prevent ioredis from crashing the process when Redis is unavailable.
  client.on("error", () => {
    // swallow - queue operations should handle failures gracefully.
  });

  bullRedisClient = client;
  return bullRedisClient;
}

/**
 * Nomes das queues
 */
export const QUEUE_NAMES = {
  LEAD_EXPIRY: "lead-expiry",
  QUEUE_RECALCULATION: "queue-recalculation",
  CLEANUP: "cleanup",
  ASSISTANT_RECALCULATION: "assistant-recalculation",
  LEAD_AUTO_REPLY: "lead-auto-reply",
} as const;

/**
 * Configurações de retry
 */
export const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: "exponential" as const,
    delay: 2000,
  },
  removeOnComplete: {
    age: 24 * 3600, // Manter por 24h
    count: 1000,
  },
  removeOnFail: {
    age: 7 * 24 * 3600, // Manter por 7 dias
  },
};
