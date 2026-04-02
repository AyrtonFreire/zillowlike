import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { normalizePhoneE164 } from "@/lib/sms";

const normalizeOptionalText = (value: unknown) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeOptionalUrl = (value: unknown) => {
  const normalized = normalizeOptionalText(value);
  if (typeof normalized !== "string") return normalized;
  if (/^https?:\/\//i.test(normalized)) return normalized;
  return `https://${normalized}`;
};

const normalizeOptionalState = (value: unknown) => {
  const normalized = normalizeOptionalText(value);
  if (typeof normalized !== "string") return normalized;
  return normalized.toUpperCase();
};

const normalizeOptionalPhone = (value: unknown) => {
  const normalized = normalizeOptionalText(value);
  if (typeof normalized !== "string") return normalized;
  return normalized;
};

const normalizeOptionalSocialHandle = (value: unknown) => {
  const normalized = normalizeOptionalText(value);
  if (typeof normalized !== "string") return normalized;
  return normalized.replace(/^@+/, "");
};

const normalizeStringList = (value: unknown) => {
  if (value === undefined) return undefined;
  if (value === null) return [];
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || "").trim())
      .filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(/[\n,;|]/g)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return value;
};

export const agencyProfileConfigSchema = z.object({
  website: z.preprocess(
    normalizeOptionalUrl,
    z.union([z.string().url("Informe um site válido.").max(2048, "O link do site é muito longo."), z.null()]).optional()
  ),
  specialties: z.preprocess(
    normalizeStringList,
    z.array(z.string().trim().min(1).max(80)).max(12, "Informe até 12 especialidades.").optional()
  ),
  yearsInBusiness: z.union([z.number().int().min(0).max(250), z.null()]).optional(),
  primaryAgentUserId: z.preprocess(normalizeOptionalText, z.union([z.string().min(1), z.null()]).optional()),
});

export const agencyPublicLeadConfigSchema = z.object({
  playbookBuy: z.preprocess(
    normalizeOptionalText,
    z.union([z.string().max(500, "O playbook de compra pode ter no máximo 500 caracteres."), z.null()]).optional()
  ),
  playbookRent: z.preprocess(
    normalizeOptionalText,
    z.union([z.string().max(500, "O playbook de locação pode ter no máximo 500 caracteres."), z.null()]).optional()
  ),
  playbookList: z.preprocess(
    normalizeOptionalText,
    z.union([z.string().max(500, "O playbook de captação pode ter no máximo 500 caracteres."), z.null()]).optional()
  ),
  routing: z
    .object({
      buyRealtorId: z.preprocess(normalizeOptionalText, z.union([z.string().min(1), z.null()]).optional()),
      rentRealtorId: z.preprocess(normalizeOptionalText, z.union([z.string().min(1), z.null()]).optional()),
      listRealtorId: z.preprocess(normalizeOptionalText, z.union([z.string().min(1), z.null()]).optional()),
    })
    .optional(),
});

export const agencyProfilePatchSchema = z
  .object({
    name: z.string().trim().min(2, "Informe o nome da imobiliária.").max(120, "O nome pode ter no máximo 120 caracteres.").optional(),
    phone: z.preprocess(
      normalizeOptionalPhone,
      z.union([z.string().max(40, "O telefone comercial é muito longo."), z.null()]).optional()
    ),
    publicHeadline: z.preprocess(
      normalizeOptionalText,
      z.union([z.string().max(120, "A headline pode ter no máximo 120 caracteres."), z.null()]).optional()
    ),
    publicBio: z.preprocess(
      normalizeOptionalText,
      z.union([z.string().max(500, "A bio institucional pode ter no máximo 500 caracteres."), z.null()]).optional()
    ),
    publicCity: z.preprocess(
      normalizeOptionalText,
      z.union([z.string().max(80, "A cidade pode ter no máximo 80 caracteres."), z.null()]).optional()
    ),
    publicState: z.preprocess(
      normalizeOptionalState,
      z.union([z.string().regex(/^[A-Z]{2}$/, "Informe a UF com 2 letras."), z.null()]).optional()
    ),
    publicServiceAreas: z.preprocess(
      normalizeStringList,
      z.array(z.string().trim().min(1).max(80)).max(20, "Informe até 20 bairros/regiões.").optional()
    ),
    publicWhatsApp: z.preprocess(
      normalizeOptionalPhone,
      z.union([z.string().max(40, "O WhatsApp é muito longo."), z.null()]).optional()
    ),
    publicInstagram: z.preprocess(
      normalizeOptionalSocialHandle,
      z.union([z.string().max(120, "O Instagram é muito longo."), z.null()]).optional()
    ),
    website: agencyProfileConfigSchema.shape.website,
    specialties: agencyProfileConfigSchema.shape.specialties,
    yearsInBusiness: agencyProfileConfigSchema.shape.yearsInBusiness,
    primaryAgentUserId: agencyProfileConfigSchema.shape.primaryAgentUserId,
    playbookBuy: agencyPublicLeadConfigSchema.shape.playbookBuy,
    playbookRent: agencyPublicLeadConfigSchema.shape.playbookRent,
    playbookList: agencyPublicLeadConfigSchema.shape.playbookList,
    routing: agencyPublicLeadConfigSchema.shape.routing,
  })
  .strict();

export type AgencyProfileConfig = z.infer<typeof agencyProfileConfigSchema>;
export type AgencyPublicLeadConfig = z.infer<typeof agencyPublicLeadConfigSchema>;
export type AgencyProfilePatchInput = z.infer<typeof agencyProfilePatchSchema>;

export const DEFAULT_AGENCY_PUBLIC_LEAD_CONFIG: Required<AgencyPublicLeadConfig> = {
  playbookBuy: "Olá! Obrigado pelo contato. Vou entender seu momento de compra e já separar opções alinhadas ao seu perfil.",
  playbookRent: "Olá! Obrigado pelo contato. Vou te enviar opções de locação dentro da região e faixa que você procura.",
  playbookList: "Olá! Obrigado pelo interesse em anunciar com a gente. Vou te explicar os próximos passos para avaliarmos seu imóvel.",
  routing: {
    buyRealtorId: null,
    rentRealtorId: null,
    listRealtorId: null,
  },
};

export const DEFAULT_AGENCY_PROFILE_CONFIG: Required<AgencyProfileConfig> = {
  website: null,
  specialties: [],
  yearsInBusiness: null,
  primaryAgentUserId: null,
};

function agencyProfileConfigKey(teamId: string) {
  return `agency:${teamId}:profileConfig`;
}

function agencyLeadConfigKey(teamId: string) {
  return `agency:${teamId}:publicLeadConfig`;
}

function safeJsonParse<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value);
    return parsed as T;
  } catch {
    return fallback;
  }
}

function normalizeConfig(config: AgencyProfileConfig | null | undefined): Required<AgencyProfileConfig> {
  const parsed = agencyProfileConfigSchema.safeParse(config || {});
  if (!parsed.success) return { ...DEFAULT_AGENCY_PROFILE_CONFIG };
  return {
    website: parsed.data.website ?? null,
    specialties: Array.isArray(parsed.data.specialties) ? parsed.data.specialties : [],
    yearsInBusiness: typeof parsed.data.yearsInBusiness === "number" ? parsed.data.yearsInBusiness : null,
    primaryAgentUserId: parsed.data.primaryAgentUserId ?? null,
  };
}

function normalizeLeadConfig(config: AgencyPublicLeadConfig | null | undefined): Required<AgencyPublicLeadConfig> {
  const parsed = agencyPublicLeadConfigSchema.safeParse(config || {});
  if (!parsed.success) return { ...DEFAULT_AGENCY_PUBLIC_LEAD_CONFIG, routing: { ...DEFAULT_AGENCY_PUBLIC_LEAD_CONFIG.routing } };
  return {
    playbookBuy: parsed.data.playbookBuy ?? DEFAULT_AGENCY_PUBLIC_LEAD_CONFIG.playbookBuy,
    playbookRent: parsed.data.playbookRent ?? DEFAULT_AGENCY_PUBLIC_LEAD_CONFIG.playbookRent,
    playbookList: parsed.data.playbookList ?? DEFAULT_AGENCY_PUBLIC_LEAD_CONFIG.playbookList,
    routing: {
      buyRealtorId: parsed.data.routing?.buyRealtorId ?? null,
      rentRealtorId: parsed.data.routing?.rentRealtorId ?? null,
      listRealtorId: parsed.data.routing?.listRealtorId ?? null,
    },
  };
}

export function normalizeAgencyPhone(value: string | null | undefined) {
  const raw = String(value || "").trim();
  if (!raw) return { raw: null, normalized: null };
  const normalized = normalizePhoneE164(raw);
  return { raw, normalized: normalized || null };
}

export function normalizeAgencyWhatsApp(value: string | null | undefined) {
  const raw = String(value || "").trim();
  if (!raw) return { raw: null, normalized: null };
  const normalized = normalizePhoneE164(raw);
  return { raw: normalized || raw, normalized: normalized || null };
}

export async function getAgencyProfileConfig(teamId: string) {
  const record = await (prisma as any).systemSetting.findUnique({
    where: { key: agencyProfileConfigKey(teamId) },
    select: { value: true },
  });
  return normalizeConfig(safeJsonParse(record?.value, DEFAULT_AGENCY_PROFILE_CONFIG));
}

export async function getAgencyPublicLeadConfig(teamId: string) {
  const record = await (prisma as any).systemSetting.findUnique({
    where: { key: agencyLeadConfigKey(teamId) },
    select: { value: true },
  });
  return normalizeLeadConfig(safeJsonParse(record?.value, DEFAULT_AGENCY_PUBLIC_LEAD_CONFIG));
}

export async function getAgencyConfigs(teamId: string) {
  const [profileConfig, leadConfig] = await Promise.all([
    getAgencyProfileConfig(teamId),
    getAgencyPublicLeadConfig(teamId),
  ]);
  return { profileConfig, leadConfig };
}

export async function upsertAgencyProfileConfig(tx: any, teamId: string, config: AgencyProfileConfig, updatedByUserId: string) {
  const normalized = normalizeConfig(config);
  return await tx.systemSetting.upsert({
    where: { key: agencyProfileConfigKey(teamId) },
    create: {
      key: agencyProfileConfigKey(teamId),
      value: JSON.stringify(normalized),
      updatedByUserId,
    },
    update: {
      value: JSON.stringify(normalized),
      updatedByUserId,
    },
    select: { key: true },
  });
}

export async function upsertAgencyPublicLeadConfig(tx: any, teamId: string, config: AgencyPublicLeadConfig, updatedByUserId: string) {
  const normalized = normalizeLeadConfig(config);
  return await tx.systemSetting.upsert({
    where: { key: agencyLeadConfigKey(teamId) },
    create: {
      key: agencyLeadConfigKey(teamId),
      value: JSON.stringify(normalized),
      updatedByUserId,
    },
    update: {
      value: JSON.stringify(normalized),
      updatedByUserId,
    },
    select: { key: true },
  });
}

export function getAgencyProfileCompletion(input: {
  logoUrl?: string | null;
  publicHeadline?: string | null;
  publicBio?: string | null;
  publicCity?: string | null;
  publicState?: string | null;
  publicServiceAreas?: string[] | null;
  publicWhatsApp?: string | null;
  publicInstagram?: string | null;
  website?: string | null;
  specialties?: string[] | null;
  yearsInBusiness?: number | null;
  verifiedPhoneVisible?: boolean;
}) {
  const checklist = [
    { key: "logo", label: "Logo configurado", done: Boolean(String(input.logoUrl || "").trim()) },
    { key: "headline", label: "Headline institucional", done: Boolean(String(input.publicHeadline || "").trim()) },
    { key: "bio", label: "Bio institucional", done: Boolean(String(input.publicBio || "").trim()) },
    { key: "location", label: "Cidade e UF", done: Boolean(String(input.publicCity || "").trim() && String(input.publicState || "").trim()) },
    { key: "areas", label: "Regiões atendidas", done: Array.isArray(input.publicServiceAreas) && input.publicServiceAreas.length > 0 },
    { key: "whatsapp", label: "WhatsApp público", done: Boolean(String(input.publicWhatsApp || "").trim()) },
    { key: "instagram", label: "Instagram", done: Boolean(String(input.publicInstagram || "").trim()) },
    { key: "website", label: "Site institucional", done: Boolean(String(input.website || "").trim()) },
    { key: "specialties", label: "Especialidades", done: Array.isArray(input.specialties) && input.specialties.length > 0 },
    { key: "experience", label: "Tempo de mercado", done: typeof input.yearsInBusiness === "number" && input.yearsInBusiness > 0 },
    { key: "phone", label: "Telefone verificado para exibição", done: Boolean(input.verifiedPhoneVisible) },
  ];

  const completed = checklist.filter((item) => item.done).length;
  const score = Math.round((completed / checklist.length) * 100);

  return { score, checklist };
}

export function getRoutingTargetByIntent(
  config: AgencyPublicLeadConfig | Required<AgencyPublicLeadConfig> | null | undefined,
  intent: string | null | undefined
) {
  const normalizedIntent = String(intent || "").trim().toUpperCase();
  const routing = normalizeLeadConfig(config || DEFAULT_AGENCY_PUBLIC_LEAD_CONFIG).routing;
  if (normalizedIntent === "BUY") return routing.buyRealtorId || null;
  if (normalizedIntent === "RENT") return routing.rentRealtorId || null;
  if (normalizedIntent === "LIST") return routing.listRealtorId || null;
  return null;
}
