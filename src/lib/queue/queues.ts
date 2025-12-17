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

export const leadDistributionQueue = maybeQueue(QUEUE_NAMES.LEAD_DISTRIBUTION);

/**
 * Queue para liberar reservas expiradas
 */
export const reservationExpiryQueue = maybeQueue(QUEUE_NAMES.RESERVATION_EXPIRY);

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

/**
 * Adicionar job para distribuir lead
 */
export async function scheduleLeadDistribution(leadId: string) {
  if (!leadDistributionQueue) return Promise.resolve();
  return leadDistributionQueue.add(
    "distribute-lead",
    { leadId },
    {
      priority: 1, // Alta prioridade
    }
  );
}

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
 * Adicionar job recorrente para checar reservas expiradas
 */
export async function scheduleReservationCheck() {
  if (!reservationExpiryQueue) return Promise.resolve();
  return reservationExpiryQueue.add(
    "check-expired-reservations",
    {},
    {
      repeat: {
        every: 60 * 1000, // A cada 1 minuto
      },
      jobId: "reservation-check", // ID único para evitar duplicatas
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
 * Adicionar job recorrente para distribuir leads pendentes
 */
export async function schedulePendingDistribution() {
  if (!leadDistributionQueue) return Promise.resolve();
  return leadDistributionQueue.add(
    "distribute-pending",
    {},
    {
      repeat: {
        every: 2 * 60 * 1000, // A cada 2 minutos
      },
      jobId: "pending-distribution",
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
    scheduleReservationCheck(),
    scheduleLeadExpiryCheck(),
    scheduleQueueRecalculation(),
    scheduleCleanup(),
    schedulePendingDistribution(),
    scheduleAssistantRecalculation(),
  ]);
}

/**
 * Get all queues for admin dashboard
 */
export function getQueues() {
  return {
    [QUEUE_NAMES.LEAD_DISTRIBUTION]: leadDistributionQueue,
    [QUEUE_NAMES.RESERVATION_EXPIRY]: reservationExpiryQueue,
    [QUEUE_NAMES.LEAD_EXPIRY]: leadExpiryQueue,
    [QUEUE_NAMES.QUEUE_RECALCULATION]: queueRecalculationQueue,
    [QUEUE_NAMES.CLEANUP]: cleanupQueue,
    [QUEUE_NAMES.ASSISTANT_RECALCULATION]: assistantRecalculationQueue,
  };
}
