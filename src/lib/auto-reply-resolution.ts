import { prisma } from "@/lib/prisma";

/**
 * Detecta leads em que o corretor (humano) já respondeu DEPOIS da última mensagem do cliente.
 * Padrão idêntico ao usado em src/lib/realtor-assistant-service.ts (needsHumanFollowUp):
 * `lastHumanProChatAt > lastClientMessageAt` → lead resolvido.
 *
 * Usado pelos endpoints do Assistente Offline para sumir avisos que o corretor já tratou.
 */
export async function getLeadIdsResolvedByHuman(leadIds: string[]): Promise<Set<string>> {
  if (!leadIds.length) return new Set();

  let lastHumanReplies: Array<{ leadId: string; createdAt: Date }> = [];
  let lastClientMessages: Array<{ leadId: string; createdAt: Date }> = [];

  try {
    [lastHumanReplies, lastClientMessages] = await Promise.all([
      (prisma as any).leadClientMessage.findMany({
        where: { leadId: { in: leadIds }, fromClient: false, source: "HUMAN" as any },
        orderBy: { createdAt: "desc" },
        distinct: ["leadId"],
        select: { leadId: true, createdAt: true },
      }),
      (prisma as any).leadClientMessage.findMany({
        where: { leadId: { in: leadIds }, fromClient: true },
        orderBy: { createdAt: "desc" },
        distinct: ["leadId"],
        select: { leadId: true, createdAt: true },
      }),
    ]);
  } catch (error: any) {
    if (error?.code !== "P2021") throw error;
    return new Set();
  }

  const humanMap = new Map<string, number>();
  for (const m of lastHumanReplies) {
    humanMap.set(String(m.leadId), new Date(m.createdAt).getTime());
  }

  const clientMap = new Map<string, number>();
  for (const m of lastClientMessages) {
    clientMap.set(String(m.leadId), new Date(m.createdAt).getTime());
  }

  const resolved = new Set<string>();
  for (const id of leadIds) {
    const hum = humanMap.get(id);
    const cli = clientMap.get(id);
    if (hum && cli && hum > cli) {
      resolved.add(id);
    }
  }
  return resolved;
}
