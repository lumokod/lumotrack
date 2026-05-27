import { z } from "zod";
import { shipmentStatusEnum } from "@/db/schema";

export const createShipmentSchema = z.object({
  longitude: z.number().min(-180).max(180),
  latitude: z.number().min(-90).max(90),
  content: z.string().min(1).max(100),
  weight: z.number().gt(0).lt(25),
  estimatedDelivery: z.iso.datetime().transform((v) => new Date(v)),
});

export const updateShipmentSchema = z
  .object({
    longitude: z.number().min(-180).max(180).optional(),
    latitude: z.number().min(-90).max(90).optional(),
    content: z.string().min(1).max(100).optional(),
    weight: z.number().gt(0).lt(25).optional(),
    estimatedDelivery: z.iso
      .datetime()
      .optional()
      .transform((v) => (v !== undefined ? new Date(v) : undefined)),
    status: z.enum(shipmentStatusEnum.enumValues).optional(),
  })
  .refine(
    (data) => {
      const hasLon = data.longitude !== undefined;
      const hasLat = data.latitude !== undefined;
      return hasLon === hasLat;
    },
    { message: "longitude and latitude must be provided together" },
  );

export type CreateShipmentInput = z.infer<typeof createShipmentSchema>;
export type UpdateShipmentInput = z.infer<typeof updateShipmentSchema>;
