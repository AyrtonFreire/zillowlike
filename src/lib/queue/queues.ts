import { Queue } from "bullmq";
import { QUEUE_NAMES, getRedisConnection, defaultJobOptions } from "./config";

/**
 * Queue para distribuição de novos leads
 */
const connection = getRedisConnection();

const maybeQueue = (name: string) =>
  connection
    ? new Queue(name, { connection, defaultJobOptions })
    : null;

/**
 * Queue para expirar leads antigos
 */
export const leadExpiryQueue = maybeQueue(QUEUE_NAMES.LEAD_EXPIRY);

/**
 * Queue para recalcular posições na fila
 */
export const queueRecalculationQueue = maybeQueue(QUEUE_NAMES.QUEUE_RECALCULATION);

/**
 * Queue para limpeza de dados antigos
 */
export const cleanupQueue = maybeQueue(QUEUE_NAMES.CLEANUP);

/**
 * Queue para recalcular itens do Assistente do Corretor
 */
export const assistantRecalculationQueue = maybeQueue(QUEUE_NAMES.ASSISTANT_RECALCULATION);

export const leadAutoReplyQueue = maybeQueue(QUEUE_NAMES.LEAD_AUTO_REPLY);

/**
 * Adicionar job recorrente para recalcular itens do Assistente
 */
export async function scheduleAssistantRecalculation() {
  if (!assistantRecalculationQueue) return Promise.resolve();
  return assistantRecalculationQueue.add(
    "assistant-recalculate",
    {},
    {
      repeat: {
        every: 10 * 60 * 1000, // A cada 10 minutos
      },
      jobId: "assistant-recalculation",
    }
  );
}

/**
 * Adicionar job recorrente para expirar leads
 */
export async function scheduleLeadExpiryCheck() {
  if (!leadExpiryQueue) return Promise.resolve();
  return leadExpiryQueue.add(
    "check-expired-leads",
    {},
    {
      repeat: {
        every: 5 * 60 * 1000, // A cada 5 minutos
      },
      jobId: "lead-expiry-check",
    }
  );
}

/**
 * Adicionar job recorrente para recalcular fila
 */
export async function scheduleQueueRecalculation() {
  if (!queueRecalculationQueue) return Promise.resolve();
  return queueRecalculationQueue.add(
    "recalculate-queue",
    {},
    {
      repeat: {
        every: 10 * 60 * 1000, // A cada 10 minutos
      },
      jobId: "queue-recalculation",
    }
  );
}

/**
 * Adicionar job recorrente para limpeza
 */
export async function scheduleCleanup() {
  if (!cleanupQueue) return Promise.resolve();
  return cleanupQueue.add(
    "cleanup-old-data",
    {},
    {
      repeat: {
        every: 60 * 60 * 1000, // A cada 1 hora
      },
      jobId: "cleanup",
    }
  );
}

/**
 * Inicializar todos os jobs recorrentes
 */
export async function initializeRecurringJobs() {
  if (!connection) return; // queues desabilitadas
  await Promise.all([
    scheduleLeadExpiryCheck(),
    scheduleQueueRecalculation(),
    scheduleCleanup(),
    scheduleAssistantRecalculation(),
  ]);
}

/**
 * Get all queues for admin dashboard
 */
export function getQueues() {
  return {
    [QUEUE_NAMES.LEAD_EXPIRY]: leadExpiryQueue,
    [QUEUE_NAMES.QUEUE_RECALCULATION]: queueRecalculationQueue,
    [QUEUE_NAMES.CLEANUP]: cleanupQueue,
    [QUEUE_NAMES.ASSISTANT_RECALCULATION]: assistantRecalculationQueue,
    [QUEUE_NAMES.LEAD_AUTO_REPLY]: leadAutoReplyQueue,
  };
}
