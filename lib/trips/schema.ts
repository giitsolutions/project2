import { z } from "zod";

export const MAX_SAVED_TRIPS = 100;

export const savedTripRequestSchema = z.object({
  truckId: z.string().min(1).max(100),
  modelId: z.string().max(100).optional(),
  routes: z.array(z.string().min(1).max(120)).min(2).max(10),
  tripType: z.enum(["one-way", "two-way"]),
  payloadTons: z.number().positive(),
  capacityTons: z.number().positive(),
  overrides: z.record(z.string(), z.union([z.number(), z.string()])).optional(),
  excluded_heads: z.array(z.string().max(50)).max(30).optional(),
});

export const savedTripSummarySchema = z.object({
  origin: z.string().min(1).max(120),
  destination: z.string().min(1).max(120),
  distanceKm: z.number().nonnegative(),
  totalCost: z.number().nonnegative(),
  tripDays: z.number().nonnegative().optional(),
  truckLabel: z.string().max(120).optional(),
  modelLabel: z.string().max(120).optional(),
  ptpkPayload: z.number().nonnegative().optional(),
});

export const savedTripInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Give the trip a name")
    .max(80, "Trip name must be at most 80 characters"),
  request: savedTripRequestSchema,
  summary: savedTripSummarySchema,
});

export type SavedTripInput = z.infer<typeof savedTripInputSchema>;

export interface SavedTrip extends SavedTripInput {
  id: string;
  createdAt: string;
}
