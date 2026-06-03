import { z } from "zod";

export const eventSchema = z.object({
  id: z.string(),
  status: z.string(),
  description: z.string().nullable(),
  address: z.string(),
  shipmentId: z.string(),
  createdAt: z.string(),
});
