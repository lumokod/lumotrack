import type { z } from "zod";
import type {
  shipmentStatusSchema,
  createShipmentSchema,
  updateShipmentSchema,
} from "./shipments.validation";
import type { shipments } from "@/db/schema";

export type Shipment = typeof shipments.$inferSelect;
export type ShipmentStatus = z.infer<typeof shipmentStatusSchema>;
export type CreateShipmentInput = z.infer<typeof createShipmentSchema>;
export type UpdateShipmentInput = z.infer<typeof updateShipmentSchema>;
