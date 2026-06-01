import { and, asc, eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { db } from "@/core/db";
import { events, shipments } from "@/db/schema";
import type { CreateEventInput } from "./events.types";

export async function createEvent(
  shipmentId: string,
  driverId: string,
  data: CreateEventInput,
) {
  const [shipment] = await db
    .select()
    .from(shipments)
    .where(and(eq(shipments.id, shipmentId), eq(shipments.driverId, driverId)))
    .limit(1);

  if (!shipment) {
    throw new HTTPException(404, {
      message: "Shipment not found or not assigned to you",
    });
  }

  const [event] = await db
    .insert(events)
    .values({ ...data, shipmentId })
    .returning();

  return event;
}

export async function getShipmentEvents(
  shipmentId: string,
  sellerId: string,
) {
  const [shipment] = await db
    .select()
    .from(shipments)
    .where(and(eq(shipments.id, shipmentId), eq(shipments.sellerId, sellerId)))
    .limit(1);

  if (!shipment) {
    throw new HTTPException(404, { message: "Shipment not found" });
  }

  return db
    .select()
    .from(events)
    .where(eq(events.shipmentId, shipmentId))
    .orderBy(asc(events.createdAt));
}
