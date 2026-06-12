import { and, asc, eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { db } from "@/core/db";
import { events, shipments } from "@/db/schema";
import type { CreateEventInput, EventStatus } from "./events.types";
import type { ShipmentStatus } from "@/features/shipments/shipments.types";
import { notificationQueue } from "@/lib/queue";

const EVENT_TO_SHIPMENT_STATUS: Partial<Record<EventStatus, ShipmentStatus>> = {
  departed: "picked_up",
  arrived: "in_transit",
  out_for_delivery: "out_for_delivery",
  delivered: "delivered",
};

export async function createEvent(
  shipmentId: string,
  driverUserId: string,
  data: CreateEventInput,
) {
  const [shipment] = await db
    .select()
    .from(shipments)
    .where(
      and(
        eq(shipments.id, shipmentId),
        eq(shipments.driverUserId, driverUserId),
      ),
    )
    .limit(1);

  if (!shipment) {
    throw new HTTPException(404, {
      message: "Shipment not found or not assigned to you",
    });
  }

  const [event] = await db.transaction(async (tx) => {
    const [inserted] = await tx
      .insert(events)
      .values({ ...data, shipmentId })
      .returning();

    const newStatus = EVENT_TO_SHIPMENT_STATUS[data.status];
    if (newStatus) {
      await tx
        .update(shipments)
        .set({ status: newStatus })
        .where(eq(shipments.id, shipmentId));
    }

    return [inserted];
  });

  if (shipment.clientContactEmail) {
    await notificationQueue.add("shipment-update", {
      type: "shipment-update",
      email: shipment.clientContactEmail,
      shipmentContent: shipment.content,
      eventStatus: data.status,
    });
  }

  if (shipment.clientContactPhone) {
    await notificationQueue.add("sms-shipment-update", {
      type: "sms-shipment-update",
      phone: shipment.clientContactPhone,
      shipmentContent: shipment.content,
      eventStatus: data.status,
    });
  }

  return event;
}

export async function getShipmentEvents(shipmentId: string, orgId: string) {
  const [shipment] = await db
    .select()
    .from(shipments)
    .where(
      and(eq(shipments.id, shipmentId), eq(shipments.organizationId, orgId)),
    )
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
