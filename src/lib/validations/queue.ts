import { z } from "zod";

export const joinQueueSchema = z.object({
  realtorId: z.string().min(1, "realtorId é obrigatório"),
});

export type JoinQueueInput = z.infer<typeof joinQueueSchema>;
