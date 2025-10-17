import { z } from "zod";

export const createRatingSchema = z.object({
  leadId: z.string().min(1, "leadId é obrigatório"),
  realtorId: z.string().min(1, "realtorId é obrigatório"),
  rating: z.number().int().min(1, "Rating deve ser entre 1 e 5").max(5, "Rating deve ser entre 1 e 5"),
  comment: z.string().optional(),
});

export type CreateRatingInput = z.infer<typeof createRatingSchema>;
