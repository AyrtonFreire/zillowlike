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

export const ConditionTagEnum = z.enum([
  "Mobiliado",
  "Semi-mobiliado",
  "Novo",
  "Em construção",
  "Condomínio fechado",
  "Reformado",
  "Pronto para morar",
]);

export const PropertyCreateSchema = z.object({
  title: z.string().min(3).max(70),
  description: z.string().min(10).max(5000),
  priceBRL: z
    .number()
    .int()
    .positive()
    .max(1_000_000_000), // até R$ 1 bi (inteiro em reais)
  type: PropertyTypeEnum,
  purpose: PurposeEnum.optional(),
  address: z.object({
    street: z.string().min(1).max(200),
    neighborhood: z.string().max(120).optional().nullable(),
    city: z.string().min(1).max(120),
    state: z.string().min(1).max(10),
    postalCode: z.string().max(20).optional().nullable(),
  }),
  geo: z.object({
    lat: z.number().gte(-90).lte(90),
    lng: z.number().gte(-180).lte(180),
  }),
  details: z
    .object({
      bedrooms: z.number().int().min(0).max(50).nullable().optional(),
      bathrooms: z.number().min(0).max(50).nullable().optional(),
      areaM2: z.number().int().min(0).max(100000).nullable().optional(),
    })
    .optional(),
  conditionTags: z.array(ConditionTagEnum).max(5).optional(),
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
  sort: z.enum(["recent","price_asc","price_desc"]).optional(),
  bedroomsMin: z.string().regex(/^\d+$/).optional(),
  bathroomsMin: z.string().regex(/^(\d+)(\.\d+)?$/).optional(),
  areaMin: z.string().regex(/^\d+$/).optional(),
  // map bounds (as strings to align with URLSearchParams)
  minLat: z.string().regex(/^-?\d+(\.\d+)?$/).optional(),
  maxLat: z.string().regex(/^-?\d+(\.\d+)?$/).optional(),
  minLng: z.string().regex(/^-?\d+(\.\d+)?$/).optional(),
  maxLng: z.string().regex(/^-?\d+(\.\d+)?$/).optional(),
});
