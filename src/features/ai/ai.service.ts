import { generateText, stepCountIs, tool } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { env } from "@/core/env";
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

const anthropic = createAnthropic({ apiKey: env.ANTHROPIC_API_KEY });

export async function chat(question: string, sellerId: string): Promise<string> {
  const { text } = await generateText({
    model: anthropic("claude-sonnet-4-6"),
    system:
      "You are a helpful logistics assistant for sellers. Help them manage their shipments by using the available tools.",
    prompt: question,
    tools: {
      get_all_shipments: tool({
        description: "Get all shipments for the seller",
        inputSchema: z.object({}),
        execute: async () => getAllShipments(sellerId),
      }),
      get_shipment_by_id: tool({
        description: "Get a single shipment by its ID",
        inputSchema: z.object({ shipment_id: z.string() }),
        execute: async ({ shipment_id }) => getShipmentById(shipment_id, sellerId),
      }),
      get_shipments_by_status: tool({
        description: "Get all shipments filtered by status",
        inputSchema: z.object({
          status: z.enum(shipmentStatusEnum.enumValues),
        }),
        execute: async ({ status }) => getShipmentsByStatus(status, sellerId),
      }),
      create_shipment: tool({
        description: "Create a new shipment",
        inputSchema: createShipmentSchema,
        execute: async (shipment) =>
          createShipment(shipment, sellerId),
      }),
      update_shipment: tool({
        description: "Update an existing shipment",
        inputSchema: updateShipmentSchema.extend({ shipment_id: z.string() }),
        execute: async ({ shipment_id, ...rest }) =>
          updateShipment(shipment_id, rest, sellerId),
      }),
      delete_shipment: tool({
        description: "Delete a shipment by its ID",
        inputSchema: z.object({ shipment_id: z.string() }),
        execute: async ({ shipment_id }) => deleteShipment(shipment_id, sellerId),
      }),
    },
    stopWhen: stepCountIs(5),
  });

  return text;
}
