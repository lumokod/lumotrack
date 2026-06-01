import type { z } from "zod";
import type {
  shipmentStatusSchema,
  createShipmentSchema,
  updateShipmentSchema,
} from "./shipments.validation";

export type ShipmentStatus = z.infer<typeof shipmentStatusSchema>;
export type CreateShipmentInput = z.infer<typeof createShipmentSchema>;
export type UpdateShipmentInput = z.infer<typeof updateShipmentSchema>;
