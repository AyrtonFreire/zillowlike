import { ConnectionOptions } from "bullmq";

/**
 * Configuração de conexão Redis para BullMQ
 */
export const redisConnection: ConnectionOptions = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null, // Recomendado para BullMQ
};

/**
 * Nomes das queues
 */
export const QUEUE_NAMES = {
  LEAD_DISTRIBUTION: "lead-distribution",
  RESERVATION_EXPIRY: "reservation-expiry",
  LEAD_EXPIRY: "lead-expiry",
  QUEUE_RECALCULATION: "queue-recalculation",
  CLEANUP: "cleanup",
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
