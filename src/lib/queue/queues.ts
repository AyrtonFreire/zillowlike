import { Queue } from "bullmq";
import { QUEUE_NAMES, redisConnection, defaultJobOptions } from "./config";

/**
 * Queue para distribuição de novos leads
 */
export const leadDistributionQueue = new Queue(
  QUEUE_NAMES.LEAD_DISTRIBUTION,
  {
    connection: redisConnection,
    defaultJobOptions,
  }
);

/**
 * Queue para liberar reservas expiradas
 */
export const reservationExpiryQueue = new Queue(
  QUEUE_NAMES.RESERVATION_EXPIRY,
  {
    connection: redisConnection,
    defaultJobOptions,
  }
);

/**
 * Queue para expirar leads antigos
 */
export const leadExpiryQueue = new Queue(QUEUE_NAMES.LEAD_EXPIRY, {
  connection: redisConnection,
  defaultJobOptions,
});

/**
 * Queue para recalcular posições na fila
 */
export const queueRecalculationQueue = new Queue(
  QUEUE_NAMES.QUEUE_RECALCULATION,
  {
    connection: redisConnection,
    defaultJobOptions,
  }
);

/**
 * Queue para limpeza de dados antigos
 */
export const cleanupQueue = new Queue(QUEUE_NAMES.CLEANUP, {
  connection: redisConnection,
  defaultJobOptions,
});

/**
 * Adicionar job para distribuir lead
 */
export async function scheduleLeadDistribution(leadId: string) {
  return leadDistributionQueue.add(
    "distribute-lead",
    { leadId },
    {
      priority: 1, // Alta prioridade
    }
  );
}

/**
 * Adicionar job recorrente para checar reservas expiradas
 */
export async function scheduleReservationCheck() {
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
  await Promise.all([
    scheduleReservationCheck(),
    scheduleLeadExpiryCheck(),
    scheduleQueueRecalculation(),
    scheduleCleanup(),
    schedulePendingDistribution(),
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
  };
}
