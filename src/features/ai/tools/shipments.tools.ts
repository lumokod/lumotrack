import { tool } from "ai";
import { z } from "zod";
import { shipmentStatusEnum } from "@/db/schema";
import { getOrgDrivers } from "@/features/drivers/drivers.service";
import {
  getAllShipments,
  getShipmentById,
  getShipmentsByStatus,
  createShipment,
  updateShipment,
  cancelShipment,
  assignDriver,
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
    cancel_shipment: tool({
      description: "Cancel a shipment by its ID. Fails if the shipment is already delivered or cancelled.",
      inputSchema: z.object({ shipment_id: z.string() }),
      execute: async ({ shipment_id }) => cancelShipment(shipment_id, orgId),
    }),
    get_org_drivers: tool({
      description: "Get all drivers in the organization. Use this before assigning a driver to look up their ID by name.",
      inputSchema: z.object({}),
      execute: async () => getOrgDrivers(orgId),
    }),
    assign_driver: tool({
      description: "Assign a driver to a shipment by their user ID. Call get_org_drivers first if you need to resolve a name to an ID.",
      inputSchema: z.object({
        shipment_id: z.string(),
        driver_id: z.string(),
      }),
      execute: async ({ shipment_id, driver_id }) =>
        assignDriver(shipment_id, driver_id, orgId),
    }),
  };
}
