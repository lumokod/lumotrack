import { z } from "zod";
import { shipmentStatusEnum } from "@/db/schema";

const destinationSchema = z.object({
  longitude: z.number().min(-180).max(180),
  latitude: z.number().min(-90).max(90),
});

const shipmentFieldsSchema = z.object({
  destination: destinationSchema,
  content: z.string().min(1).max(100),
  weight: z.number().gt(0).lt(25),
  estimatedDelivery: z.iso
    .datetime()
    .transform((v) => new Date(v))
    .optional()
    .nullable(),
  clientContactEmail: z.email().optional().nullable(),
  clientContactPhone: z.string().min(7).max(20).optional().nullable(),
});

export const createShipmentSchema = shipmentFieldsSchema;

export const updateShipmentSchema = shipmentFieldsSchema.partial().extend({
  status: z.enum(shipmentStatusEnum.enumValues).optional(),
  originAddressId: z.uuidv7().optional().nullable(),
});

export const shipmentStatusSchema = z.enum(shipmentStatusEnum.enumValues);

export const paginationSchema = z.object({
  cursor: z.uuidv7().optional(),
});

export const shipmentsByTagsQuerySchema = z.object({
  // Comma-separated tag ids, e.g. ?tagIds=<uuid>,<uuid>
  tagIds: z
    .string()
    .transform((value) =>
      value
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean),
    )
    .pipe(z.array(z.uuidv7()).min(1).max(50)),
  cursor: z.uuidv7().optional(),
});

export const assignDriverSchema = z.object({
  driverId: z.string().min(1),
});
