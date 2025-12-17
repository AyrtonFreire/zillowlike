import { ConnectionOptions } from "bullmq";

/**
 * Obtém a configuração de conexão Redis para BullMQ de forma segura.
 * - Não usa fallback para localhost em produção/build
 * - Retorna null quando não configurado (desabilita filas)
 * - Não inicializa durante o build da Vercel
 */
export function getRedisConnection(): ConnectionOptions | null {
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return null;
  }

  const host = process.env.REDIS_HOST?.trim();
  const portStr = process.env.REDIS_PORT?.trim();
  const password = process.env.REDIS_PASSWORD?.trim();

  if (!host || !portStr) {
    return null;
  }

  const port = parseInt(portStr, 10);
  if (!Number.isFinite(port)) return null;

  return {
    host,
    port,
    password,
    maxRetriesPerRequest: null, // Recomendado para BullMQ
  } satisfies ConnectionOptions;
}

/**
 * Nomes das queues
 */
export const QUEUE_NAMES = {
  LEAD_DISTRIBUTION: "lead-distribution",
  RESERVATION_EXPIRY: "reservation-expiry",
  LEAD_EXPIRY: "lead-expiry",
  QUEUE_RECALCULATION: "queue-recalculation",
  CLEANUP: "cleanup",
  ASSISTANT_RECALCULATION: "assistant-recalculation",
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
