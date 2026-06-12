import { and, asc, eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { db } from "@/core/db";
import { events, shipments } from "@/db/schema";
import type { CreateEventInput, EventStatus } from "./events.types";
import type { Shipment, ShipmentStatus } from "@/features/shipments/shipments.types";
import { addNotification } from "@/lib/queue";

const EVENT_TO_SHIPMENT_STATUS: Partial<Record<EventStatus, ShipmentStatus>> = {
  departed: "picked_up",
  arrived: "in_transit",
  out_for_delivery: "out_for_delivery",
  delivered: "delivered",
};

function generateDeliveryCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function fetchAssignedShipment(shipmentId: string, driverUserId: string) {
  const [shipment] = await db
    .select()
    .from(shipments)
    .where(and(eq(shipments.id, shipmentId), eq(shipments.driverUserId, driverUserId)))
    .limit(1);

  if (!shipment) {
    throw new HTTPException(404, { message: "Shipment not found or not assigned to you" });
  }

  return shipment;
}

function validateDeliveryCode(
  shipment: Shipment,
  data: CreateEventInput,
) {
  if (data.status !== "delivered") return;

  if (!data.confirmationCode) {
    throw new HTTPException(400, { message: "Confirmation code is required to mark as delivered" });
  }
  if (!shipment.deliveryCode || data.confirmationCode !== shipment.deliveryCode) {
    throw new HTTPException(400, { message: "Invalid confirmation code" });
  }
}

async function persistEvent(shipmentId: string, data: CreateEventInput, deliveryCode: string | undefined) {
  const [event] = await db.transaction(async (tx) => {
    const [inserted] = await tx
      .insert(events)
      .values({
        shipmentId,
        status: data.status,
        address: data.address,
        description: data.description,
      })
      .returning();

    const newStatus = EVENT_TO_SHIPMENT_STATUS[data.status];
    if (newStatus) {
      await tx
        .update(shipments)
        .set({
          status: newStatus,
          ...(data.status === "out_for_delivery" && { deliveryCode }),
          ...(data.status === "delivered" && { deliveryCode: null }),
        })
        .where(eq(shipments.id, shipmentId));
    }

    return [inserted];
  });

  return event;
}

async function enqueueNotifications(
  shipment: Shipment,
  eventStatus: EventStatus,
  deliveryCode: string | undefined,
) {
  if (shipment.clientContactEmail) {
    await addNotification({
      type: "shipment-update",
      email: shipment.clientContactEmail,
      shipmentContent: shipment.content,
      eventStatus,
    });
  }

  if (shipment.clientContactPhone && (eventStatus === "out_for_delivery" || eventStatus === "delivered")) {
    await addNotification({
      type: "sms-shipment-update",
      phone: shipment.clientContactPhone,
      shipmentContent: shipment.content,
      eventStatus,
      ...(eventStatus === "out_for_delivery" && { deliveryCode }),
    });
  }
}

export async function createEvent(
  shipmentId: string,
  driverUserId: string,
  data: CreateEventInput,
) {
  const shipment = await fetchAssignedShipment(shipmentId, driverUserId);
  validateDeliveryCode(shipment, data);
  const deliveryCode = data.status === "out_for_delivery" ? generateDeliveryCode() : undefined;
  const event = await persistEvent(shipmentId, data, deliveryCode);
  await enqueueNotifications(shipment, data.status, deliveryCode);
  return event;
}

export async function getShipmentEvents(shipmentId: string, orgId: string) {
  const [shipment] = await db
    .select()
    .from(shipments)
    .where(and(eq(shipments.id, shipmentId), eq(shipments.organizationId, orgId)))
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
