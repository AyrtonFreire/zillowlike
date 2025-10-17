import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Serviço de gerenciamento da fila de corretores
 */
export class QueueService {
  /**
   * Adiciona corretor à fila
   */
  static async joinQueue(realtorId: string) {
    // Verifica se já está na fila
    const existing = await prisma.realtorQueue.findUnique({
      where: { realtorId },
    });

    if (existing) {
      return existing;
    }

    // Pega a última posição
    const lastPosition = await prisma.realtorQueue.findFirst({
      orderBy: { position: "desc" },
      select: { position: true },
    });

    const newPosition = (lastPosition?.position || 0) + 1;

    // Cria entrada na fila
    const queue = await prisma.realtorQueue.create({
      data: {
        realtorId,
        position: newPosition,
        score: 0,
        status: "ACTIVE",
      },
    });

    // Cria estatísticas
    await prisma.realtorStats.create({
      data: {
        realtorId,
      },
    });

    return queue;
  }

  /**
   * Retorna próximo corretor disponível na fila
   */
  static async getNextRealtor() {
    return await prisma.realtorQueue.findFirst({
      where: {
        status: "ACTIVE",
        activeLeads: { lt: 1 }, // Menos de 1 lead ativo
      },
      orderBy: [
        { position: "asc" }, // Primeiro por posição
        { score: "desc" },   // Depois por score
      ],
      include: {
        realtor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Move corretor para o fim da fila após aceitar lead
   */
  static async moveToEnd(realtorId: string) {
    const queue = await prisma.realtorQueue.findUnique({
      where: { realtorId },
    });

    if (!queue) return;

    // Pega a última posição
    const lastPosition = await prisma.realtorQueue.findFirst({
      orderBy: { position: "desc" },
      select: { position: true },
    });

    const newPosition = (lastPosition?.position || 0) + 1;

    // Atualiza posição
    await prisma.realtorQueue.update({
      where: { realtorId },
      data: {
        position: newPosition,
        lastActivity: new Date(),
      },
    });

    // Reorganiza fila (decrementa posições dos que estavam atrás)
    await prisma.$executeRaw`
      UPDATE realtor_queue 
      SET position = position - 1 
      WHERE position > ${queue.position} AND position < ${newPosition}
    `;
  }

  /**
   * Atualiza score do corretor
   */
  static async updateScore(
    realtorId: string,
    points: number,
    action: string,
    description?: string
  ) {
    const queue = await prisma.realtorQueue.findUnique({
      where: { realtorId },
    });

    if (!queue) return;

    // Atualiza score
    const newScore = Math.max(0, queue.score + points);

    await prisma.realtorQueue.update({
      where: { realtorId },
      data: {
        score: newScore,
        lastActivity: new Date(),
      },
    });

    // Registra no histórico
    await prisma.scoreHistory.create({
      data: {
        queueId: queue.id,
        action,
        points,
        description,
      },
    });

    return newScore;
  }

  /**
   * Incrementa contador de leads ativos
   */
  static async incrementActiveLeads(realtorId: string) {
    await prisma.realtorQueue.update({
      where: { realtorId },
      data: {
        activeLeads: { increment: 1 },
        totalAccepted: { increment: 1 },
        lastActivity: new Date(),
      },
    });
  }

  /**
   * Decrementa contador de leads ativos
   */
  static async decrementActiveLeads(realtorId: string) {
    await prisma.realtorQueue.update({
      where: { realtorId },
      data: {
        activeLeads: { decrement: 1 },
        lastActivity: new Date(),
      },
    });
  }

  /**
   * Incrementa contador de leads rejeitados
   */
  static async incrementRejected(realtorId: string) {
    await prisma.realtorQueue.update({
      where: { realtorId },
      data: {
        totalRejected: { increment: 1 },
        lastActivity: new Date(),
      },
    });
  }

  /**
   * Retorna posição do corretor na fila
   */
  static async getPosition(realtorId: string) {
    const queue = await prisma.realtorQueue.findUnique({
      where: { realtorId },
      include: {
        realtor: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!queue) return null;

    // Conta quantos estão na frente
    const aheadCount = await prisma.realtorQueue.count({
      where: {
        position: { lt: queue.position },
        status: "ACTIVE",
      },
    });

    return {
      ...queue,
      actualPosition: aheadCount + 1,
    };
  }

  /**
   * Retorna estatísticas da fila
   */
  static async getQueueStats() {
    const [total, active, avgScore, avgWaitTime] = await Promise.all([
      prisma.realtorQueue.count(),
      prisma.realtorQueue.count({ where: { status: "ACTIVE" } }),
      prisma.realtorQueue.aggregate({
        _avg: { score: true },
        where: { status: "ACTIVE" },
      }),
      prisma.realtorQueue.aggregate({
        _avg: { avgResponseTime: true },
        where: { status: "ACTIVE" },
      }),
    ]);

    return {
      total,
      active,
      avgScore: Math.round(avgScore._avg.score || 0),
      avgWaitTime: Math.round(avgWaitTime._avg.avgResponseTime || 0),
    };
  }
}
