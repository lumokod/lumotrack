import { z } from "zod";

export const shipmentSchema = z.object({
  id: z.string(),
  status: z.string(),
  content: z.string(),
  weight: z.number(),
  estimatedDelivery: z.string().nullable(),
  destination: z.object({ latitude: z.number(), longitude: z.number() }),
  originAddressId: z.string().nullable(),
  driverUserId: z.string().nullable(),
  organizationId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
