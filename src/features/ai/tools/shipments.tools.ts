import { tool } from "ai";
import { z } from "zod";
import { shipmentStatusEnum } from "@/db/schema";
import {
  getAllShipments,
  getShipmentById,
  getShipmentsByStatus,
  createShipment,
  updateShipment,
  deleteShipment,
} from "@/features/shipments/shipments.service";
import {
  createShipmentSchema,
  updateShipmentSchema,
} from "@/features/shipments/shipments.validation";

export function getShipmentTools(orgId: string) {
  return {
    get_all_shipments: tool({
      description: "Get all shipments for the organization",
      inputSchema: z.object({}),
      execute: async () => getAllShipments(orgId),
    }),
    get_shipment_by_id: tool({
      description: "Get a single shipment by its ID",
      inputSchema: z.object({ shipment_id: z.string() }),
      execute: async ({ shipment_id }) => getShipmentById(shipment_id, orgId),
    }),
    get_shipments_by_status: tool({
      description: "Get all shipments filtered by status",
      inputSchema: z.object({
        status: z.enum(shipmentStatusEnum.enumValues),
      }),
      execute: async ({ status }) => getShipmentsByStatus(status, orgId),
    }),
    create_shipment: tool({
      description: "Create a new shipment",
      inputSchema: createShipmentSchema,
      execute: async (shipment) => createShipment(shipment, orgId),
    }),
    update_shipment: tool({
      description: "Update an existing shipment",
      inputSchema: updateShipmentSchema.extend({ shipment_id: z.string() }),
      execute: async ({ shipment_id, ...rest }) =>
        updateShipment(shipment_id, rest, orgId),
    }),
    delete_shipment: tool({
      description: "Delete a shipment by its ID",
      inputSchema: z.object({ shipment_id: z.string() }),
      execute: async ({ shipment_id }) => deleteShipment(shipment_id, orgId),
    }),
  };
}
