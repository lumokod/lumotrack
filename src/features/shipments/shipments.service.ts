import { and, eq } from "drizzle-orm";
import { db } from "@/core/db";
import { shipments } from "@/db/schema";
import type {
  ShipmentCreate,
  ShipmentStatus,
  ShipmentUpdate,
} from "./shipments.types";
import { HTTPException } from "hono/http-exception";

export async function getAllShipments(sellerId: string) {
  return db.select().from(shipments).where(eq(shipments.sellerId, sellerId));
}

export async function getShipmentById(shipmentId: string, sellerId: string) {
  const [shipment] = await db
    .select()
    .from(shipments)
    .where(and(eq(shipments.id, shipmentId), eq(shipments.sellerId, sellerId)))
    .limit(1);
  return shipment ?? null;
}

export async function getShipmentsByStatus(
  status: ShipmentStatus,
  sellerId: string,
) {
  return db
    .select()
    .from(shipments)
    .where(and(eq(shipments.status, status), eq(shipments.sellerId, sellerId)));
}

export async function createShipment(data: ShipmentCreate, sellerId: string) {
  const [shipment] = await db
    .insert(shipments)
    .values({
      destination: { x: data.longitude, y: data.latitude },
      content: data.content,
      weight: data.weight,
      estimatedDelivery: data.estimatedDelivery,
      sellerId,
    })
    .returning();
  return shipment;
}

export async function updateShipment(
  shipmentId: string,
  data: ShipmentUpdate,
  sellerId: string,
) {
  const existing = await getShipmentById(shipmentId, sellerId);
  if (!existing) return null;

  const updateData: Partial<typeof shipments.$inferInsert> = {};
  if (data.longitude !== undefined && data.latitude !== undefined) {
    updateData.destination = { x: data.longitude, y: data.latitude };
  }
  if (data.content !== undefined) {
    updateData.content = data.content;
  }
  if (data.weight !== undefined) {
    updateData.weight = data.weight;
  }
  if (data.estimatedDelivery !== undefined) {
    updateData.estimatedDelivery = data.estimatedDelivery;
  }
  if (data.status !== undefined) {
    updateData.status = data.status;
  }

  const [updated] = await db
    .update(shipments)
    .set(updateData)
    .where(and(eq(shipments.id, shipmentId), eq(shipments.sellerId, sellerId)))
    .returning();
  return updated;
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
