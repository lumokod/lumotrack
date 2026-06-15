import { z } from "zod";

export const submitReviewSchema = z.object({
  shipmentId: z.uuidv7(),
  token: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().min(1).max(1000).optional(),
});

export const reviewQuerySchema = z.object({
  cursor: z.uuidv7().optional(),
});

export type SubmitReviewInput = z.infer<typeof submitReviewSchema>;
