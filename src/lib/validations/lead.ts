import { z } from "zod";

const leadLostReasonSchema = z.enum([
  "CLIENT_DESISTIU",
  "FECHOU_OUTRO_IMOVEL",
  "CONDICAO_FINANCEIRA",
  "NAO_RESPONDEU",
  "OUTRO",
]);

const leadWonReasonSchema = z.enum([
  "VISITA_CONVERTEU",
  "PROPOSTA_ACEITA",
  "NEGOCIACAO_DIRETA",
  "INDICACAO",
  "OUTRO",
]);

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
  transitionReason: z.string().trim().max(300, "Motivo muito longo").optional(),
  note: z.string().trim().max(600, "Nota muito longa").optional(),
  lostReason: leadLostReasonSchema.nullable().optional(),
  wonReason: leadWonReasonSchema.nullable().optional(),
  applyAutomation: z.boolean().optional(),
  source: z.string().trim().max(40, "Origem inválida").optional(),
});

// Schema para criar lead (contact form)
export const createLeadSchema = z.object({
  propertyId: z.string().min(1, "propertyId é obrigatório"),
  developmentProjectId: z.string().min(1, "developmentProjectId é obrigatório").optional(),
  developmentUnitId: z.string().min(1, "developmentUnitId é obrigatório").optional(),
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
