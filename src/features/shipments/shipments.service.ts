import { and, eq } from "drizzle-orm";
import { db } from "@/core/db";
import { shipments } from "@/db/schema";
import type {
  ShipmentStatus,
  CreateShipmentInput,
  UpdateShipmentInput,
} from "./shipments.types";
import { HTTPException } from "hono/http-exception";
import { formatShipment, paginateShipments } from "./shipments.util";

export async function getAllShipments(sellerId: string, cursor?: string) {
  return paginateShipments([eq(shipments.sellerId, sellerId)], cursor);
}

export async function getShipmentById(shipmentId: string, sellerId: string) {
  const [shipment] = await db
    .select()
    .from(shipments)
    .where(and(eq(shipments.id, shipmentId), eq(shipments.sellerId, sellerId)))
    .limit(1);
  return shipment ? formatShipment(shipment) : null;
}

export async function getShipmentsByStatus(
  status: ShipmentStatus,
  sellerId: string,
  cursor?: string,
) {
  return paginateShipments(
    [eq(shipments.sellerId, sellerId), eq(shipments.status, status)],
    cursor,
  );
}

export async function createShipment(data: CreateShipmentInput, sellerId: string) {
  const [shipment] = await db
    .insert(shipments)
    .values({
      destination: { x: data.destination.longitude, y: data.destination.latitude },
      content: data.content,
      weight: data.weight,
      estimatedDelivery: data.estimatedDelivery,
      sellerId,
    })
    .returning();
  return formatShipment(shipment);
}

export async function updateShipment(
  shipmentId: string,
  data: UpdateShipmentInput,
  sellerId: string,
) {
  const existing = await getShipmentById(shipmentId, sellerId);
  if (!existing) return null;

  const { destination, ...rest } = data;

  const updateData: Partial<typeof shipments.$inferInsert> = {
    ...rest,
    ...(destination
      ? { destination: { x: destination.longitude, y: destination.latitude } }
      : {}),
  };

  const [updated] = await db
    .update(shipments)
    .set(updateData)
    .where(and(eq(shipments.id, shipmentId), eq(shipments.sellerId, sellerId)))
    .returning();
  return updated ? formatShipment(updated) : null;
}

export async function deleteShipment(shipmentId: string, sellerId: string) {
  const existing = await getShipmentById(shipmentId, sellerId);

  if (!existing) {
    throw new HTTPException(404, { message: "Shipment not found" });
  }

  await db
    .delete(shipments)
    .where(and(eq(shipments.id, shipmentId), eq(shipments.sellerId, sellerId)));
}
