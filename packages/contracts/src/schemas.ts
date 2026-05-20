import { z } from "zod";
import { ComplexPreference, GameCode, GenerateMode, MembershipStatus, OrderStatus } from "./enums";

export const gameCodeSchema = z.nativeEnum(GameCode);
export const generateModeSchema = z.nativeEnum(GenerateMode);
export const complexPreferenceSchema = z.nativeEnum(ComplexPreference);
export const membershipStatusSchema = z.nativeEnum(MembershipStatus);
export const orderStatusSchema = z.nativeEnum(OrderStatus);

export const drawSchema = z.object({
  gameCode: gameCodeSchema,
  issue: z.string().min(1),
  drawDate: z.string().nullable(),
  primaryNumbers: z.array(z.number().int().nonnegative()),
  secondaryNumbers: z.array(z.number().int().nonnegative()),
  prizeTiers: z.array(z.record(z.string(), z.unknown())),
  sourceUrl: z.string().url().or(z.string().startsWith("fixture://")),
  sourceHash: z.string().min(1),
});

export const generateRequestSchema = z
  .object({
    gameCode: gameCodeSchema,
    mode: generateModeSchema.default(GenerateMode.RANDOM),
    count: z.number().int().min(1).max(20).default(1),
    budgetMin: z.number().int().min(0).nullable().optional(),
    budgetMax: z.number().int().min(1).nullable().optional(),
    complexPreference: complexPreferenceSchema.default(ComplexPreference.BALANCED),
    excludeHighPrizeHistory: z.boolean().default(false),
    targetPrizeMode: z.boolean().default(false),
    randomSeed: z.number().int().nullable().optional(),
  })
  .refine(
    (payload) =>
      payload.budgetMin === undefined ||
      payload.budgetMax === undefined ||
      payload.budgetMin === null ||
      payload.budgetMax === null ||
      payload.budgetMin <= payload.budgetMax,
    { message: "budgetMin must be less than or equal to budgetMax", path: ["budgetMin"] },
  );

export const paymentPrepayRequestSchema = z.object({
  productCode: z.string().min(1),
});

export const bootstrapLoginSchema = z.object({
  token: z.string().min(1),
  expiresIn: z.number().int().positive(),
  profile: z.object({
    id: z.string().min(1),
    openId: z.string().min(1),
    unionId: z.string().nullable().optional(),
    nickname: z.string().nullable().optional(),
    avatarUrl: z.string().nullable().optional(),
    isAdmin: z.boolean(),
  }),
});
