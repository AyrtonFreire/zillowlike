import { z } from "zod";

export const PropertyTypeEnum = z.enum([
  "HOUSE",
  "APARTMENT",
  "CONDO",
  "TOWNHOUSE",
  "STUDIO",
  "LAND",
  "COMMERCIAL",
]);

export const PurposeEnum = z.enum(["SALE", "RENT"]);
export const FinishFloorEnum = z.enum(["PORCELANATO","MADEIRA","VINILICO","OUTRO"]);
export const SunOrientationEnum = z.enum(["NASCENTE","POENTE","OUTRA"]);

// Free-form condition/features tags (display-only), capped by length and count
export const ConditionTagEnum = z.string().min(1).max(60);

export const PropertyCreateSchema = z.object({
  title: z.string().min(3).max(70),
  metaTitle: z.string().max(65).optional().or(z.literal("")),
  metaDescription: z.string().max(155).optional().or(z.literal("")),
  description: z.string().max(5000).optional().or(z.literal("")),
  priceBRL: z
    .number()
    .int()
    .positive()
    .max(1_000_000_000), // até R$ 1 bi (inteiro em reais)
  type: PropertyTypeEnum,
  purpose: PurposeEnum.optional(),
  // Flags usadas nos filtros de busca
  furnished: z.boolean().optional(),
  petFriendly: z.boolean().optional(),
  address: z.object({
    street: z.string().min(1).max(200),
    neighborhood: z.string().max(120).optional().nullable(),
    city: z.string().min(1).max(120),
    state: z.string().min(1).max(10),
    postalCode: z.string().max(20).optional().nullable(),
  }),
  geo: z
    .object({
      lat: z.number().gte(-90).lte(90),
      lng: z.number().gte(-180).lte(180),
    })
    .optional(),
  details: z
    .object({
      bedrooms: z.number().int().min(0).max(50).nullable().optional(),
      bathrooms: z.number().min(0).max(50).nullable().optional(),
      areaM2: z.number().int().min(0).max(100000).nullable().optional(),
      suites: z.number().int().min(0).max(50).nullable().optional(),
      parkingSpots: z.number().int().min(0).max(50).nullable().optional(),
      floor: z.number().int().min(0).max(200).nullable().optional(),
      yearBuilt: z.number().int().min(1800).max(2100).nullable().optional(),
      // Lazer / Condomínio
      hasBalcony: z.boolean().optional(),
      hasElevator: z.boolean().optional(),
      hasPool: z.boolean().optional(),
      hasGym: z.boolean().optional(),
      hasPlayground: z.boolean().optional(),
      hasPartyRoom: z.boolean().optional(),
      hasGourmet: z.boolean().optional(),
      hasConcierge24h: z.boolean().optional(),
      // Acessibilidade
      accRamps: z.boolean().optional(),
      accWideDoors: z.boolean().optional(),
      accAccessibleElevator: z.boolean().optional(),
      accTactile: z.boolean().optional(),
      // Conforto / Energia
      comfortAC: z.boolean().optional(),
      comfortHeating: z.boolean().optional(),
      comfortSolar: z.boolean().optional(),
      comfortNoiseWindows: z.boolean().optional(),
      comfortLED: z.boolean().optional(),
      comfortWaterReuse: z.boolean().optional(),
      // Acabamentos
      finishFloor: FinishFloorEnum.nullable().optional(),
      finishCabinets: z.boolean().optional(),
      finishCounterGranite: z.boolean().optional(),
      finishCounterQuartz: z.boolean().optional(),
      // Vista / Posição
      viewSea: z.boolean().optional(),
      viewCity: z.boolean().optional(),
      positionFront: z.boolean().optional(),
      positionBack: z.boolean().optional(),
      sunByRoomNote: z.string().max(500).optional(),
      // Pets / Políticas
      petsSmall: z.boolean().optional(),
      petsLarge: z.boolean().optional(),
      condoRules: z.string().max(1000).optional(),
      // Outros
      sunOrientation: SunOrientationEnum.nullable().optional(),
      yearRenovated: z.number().int().min(1800).max(2100).nullable().optional(),
      totalFloors: z.number().int().min(0).max(200).nullable().optional(),
    })
    .optional(),
  conditionTags: z.array(ConditionTagEnum).max(12).optional(),
  // Dados privados do proprietário (visíveis apenas para o dono do imóvel)
  privateData: z.object({
    ownerName: z.string().max(200).nullable().optional(),
    ownerPhone: z.string().max(50).nullable().optional(),
    ownerEmail: z.string().max(200).nullable().optional(),
    ownerAddress: z.string().max(500).nullable().optional(),
    ownerPrice: z.number().int().nullable().optional(), // em centavos
    brokerFeePercent: z.number().nullable().optional(), // percentual (ex: 5.0)
    brokerFeeFixed: z.number().int().nullable().optional(), // em centavos
    exclusive: z.boolean().optional(),
    exclusiveUntil: z.string().nullable().optional(), // ISO date
    occupied: z.boolean().optional(),
    occupantInfo: z.string().max(500).nullable().optional(),
    keyLocation: z.string().max(200).nullable().optional(),
    notes: z.string().max(2000).nullable().optional(),
  }).optional(),
  // Configurações de visibilidade do anúncio
  visibility: z.object({
    hidePrice: z.boolean().optional(),
    hideExactAddress: z.boolean().optional(),
    hideOwnerContact: z.boolean().optional(),
    hideCondoFee: z.boolean().optional(),
    hideIPTU: z.boolean().optional(),
    iptuYearly: z.number().int().nullable().optional(), // em centavos
  }).optional(),
  images: z
    .array(
      z.object({
        url: z.string().url().max(1000).optional().or(z.literal("")),
        alt: z.string().max(200).optional(),
        sortOrder: z.number().int().min(0).optional(),
      })
    )
    .max(30)
    .optional(),
});

export type PropertyCreateInput = z.infer<typeof PropertyCreateSchema>;

export const PropertyQuerySchema = z.object({
  city: z.string().max(120).optional(),
  state: z.string().max(10).optional(),
  type: PropertyTypeEnum.optional(),
  purpose: PurposeEnum.optional(),
  q: z.string().max(200).optional(),
  minPrice: z.string().regex(/^\d+$/).optional(), // em centavos
  maxPrice: z.string().regex(/^\d+$/).optional(), // em centavos
  page: z.string().regex(/^\d+$/).optional(),
  pageSize: z.string().regex(/^\d+$/).optional(),
  sort: z.enum(["recent","price_asc","price_desc","area_desc"]).optional(),
  bedroomsMin: z.string().regex(/^\d+$/).optional(),
  bathroomsMin: z.string().regex(/^(\d+)(\.\d+)?$/).optional(),
  areaMin: z.string().regex(/^\d+$/).optional(),
  // map bounds (as strings to align with URLSearchParams)
  minLat: z.string().regex(/^-?\d+(\.\d+)?$/).optional(),
  maxLat: z.string().regex(/^-?\d+(\.\d+)?$/).optional(),
  minLng: z.string().regex(/^-?\d+(\.\d+)?$/).optional(),
  maxLng: z.string().regex(/^-?\d+(\.\d+)?$/).optional(),

  // perf flags (opt-in)
  lite: z.string().max(10).optional(),
  mode: z.string().max(20).optional(),
  onlyTotal: z.string().max(10).optional(),
});
