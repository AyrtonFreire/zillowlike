import { z } from "zod";

// Schema para aceitar lead
export const acceptLeadSchema = z.object({
  realtorId: z.string().min(1, "realtorId é obrigatório"),
});

// Schema para rejeitar lead
export const rejectLeadSchema = z.object({
  realtorId: z.string().min(1, "realtorId é obrigatório"),
});

// Schema para candidatura
export const candidateLeadSchema = z.object({
  realtorId: z.string().min(1, "realtorId é obrigatório"),
});

// Schema para concluir atendimento de lead
export const completeLeadSchema = z.object({
  realtorId: z.string().min(1, "realtorId é obrigatório"),
});

// Schema para atualizar estágio de funil (pipeline)
export const updatePipelineStageSchema = z.object({
  stage: z.enum([
    "NEW",
    "CONTACT",
    "VISIT",
    "PROPOSAL",
    "DOCUMENTS",
    "WON",
    "LOST",
  ]),
});

// Schema para criar lead (contact form)
export const createLeadSchema = z.object({
  propertyId: z.string().min(1, "propertyId é obrigatório"),
  userId: z.string().optional(),
  contact: z.object({
    name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
    email: z.string().email("Email inválido"),
    phone: z.string().optional(),
  }),
  message: z.string().optional(),
});

export type AcceptLeadInput = z.infer<typeof acceptLeadSchema>;
export type RejectLeadInput = z.infer<typeof rejectLeadSchema>;
export type CandidateLeadInput = z.infer<typeof candidateLeadSchema>;
export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type CompleteLeadInput = z.infer<typeof completeLeadSchema>;
export type UpdatePipelineStageInput = z.infer<typeof updatePipelineStageSchema>;
