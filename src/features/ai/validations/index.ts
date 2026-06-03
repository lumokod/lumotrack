import { z } from "zod";
import { shipmentSchema } from "./shipments.validation";
import { eventSchema } from "./events.validation";

export const chatResponseSchema = z.object({
  message: z.string().describe("Brief human-readable summary of the result"),
  shipments: z
    .array(shipmentSchema)
    .optional()
    .describe("List of shipments when the query returns multiple"),
  shipment: shipmentSchema
    .optional()
    .describe("Single shipment for detail, create, or update operations"),
  events: z
    .array(eventSchema)
    .optional()
    .describe("List of events for a shipment"),
});

export type ChatResponse = z.infer<typeof chatResponseSchema>;
