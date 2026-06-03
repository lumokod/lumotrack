import { tool } from "ai";
import { z } from "zod";
import { getShipmentEvents } from "@/features/events/events.service";

export function getEventTools(orgId: string) {
  return {
    get_shipment_events: tool({
      description: "Get the event history (timeline) for a shipment",
      inputSchema: z.object({ shipment_id: z.string() }),
      execute: async ({ shipment_id }) => getShipmentEvents(shipment_id, orgId),
    }),
  };
}
