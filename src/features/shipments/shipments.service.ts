import { and, asc, eq } from "drizzle-orm";
import { db } from "@/core/db";
import { shipments, member, events } from "@/db/schema";
import type {
  ShipmentStatus,
  CreateShipmentInput,
  UpdateShipmentInput,
} from "./shipments.types";
import { HTTPException } from "hono/http-exception";
import { formatShipment, paginateShipments } from "./shipments.util";

export async function getAllShipments(orgId: string, cursor?: string) {
  return paginateShipments([eq(shipments.organizationId, orgId)], cursor);
}

export async function getShipmentById(shipmentId: string, orgId: string) {
  const [shipment] = await db
    .select()
    .from(shipments)
    .where(and(eq(shipments.id, shipmentId), eq(shipments.organizationId, orgId)))
    .limit(1);
  if (!shipment) {
    throw new HTTPException(404, { message: "Shipment not found" });
  }
  return formatShipment(shipment);
}

export async function getShipmentsByStatus(
  status: ShipmentStatus,
  orgId: string,
  cursor?: string,
) {
  return paginateShipments(
    [eq(shipments.organizationId, orgId), eq(shipments.status, status)],
    cursor,
  );
}

export async function getShipmentWithTimeline(shipmentId: string, orgId: string) {
  const shipment = await db.query.shipments.findFirst({
    where: and(eq(shipments.id, shipmentId), eq(shipments.organizationId, orgId)),
    with: { events: { orderBy: asc(events.createdAt) } },
  });

  if (!shipment) {
    throw new HTTPException(404, { message: "Shipment not found" });
  }

  const { destination, ...rest } = shipment;
  return { ...rest, destination: { longitude: destination.x, latitude: destination.y } };
}

export async function createShipment(data: CreateShipmentInput, orgId: string) {
  const [shipment] = await db
    .insert(shipments)
    .values({
      destination: {
        x: data.destination.longitude,
        y: data.destination.latitude,
      },
      content: data.content,
      weight: data.weight,
      estimatedDelivery: data.estimatedDelivery,
      organizationId: orgId,
    })
    .returning();
  return formatShipment(shipment);
}

export async function updateShipment(
  shipmentId: string,
  data: UpdateShipmentInput,
  orgId: string,
) {
  await getShipmentById(shipmentId, orgId);

  const { destination, ...rest } = data;
  const updateData: Partial<typeof shipments.$inferInsert> = { ...rest };

  if (destination) {
    updateData.destination = {
      x: destination.longitude,
      y: destination.latitude,
    };
  }

  const [updated] = await db
    .update(shipments)
    .set(updateData)
    .where(and(eq(shipments.id, shipmentId), eq(shipments.organizationId, orgId)))
    .returning();
  return updated ? formatShipment(updated) : null;
}

export async function deleteShipment(shipmentId: string, orgId: string) {
  await getShipmentById(shipmentId, orgId);

  await db
    .delete(shipments)
    .where(and(eq(shipments.id, shipmentId), eq(shipments.organizationId, orgId)));
}

export async function cancelShipment(shipmentId: string, orgId: string) {
  const shipment = await getShipmentById(shipmentId, orgId);

  if (shipment.status === "delivered" || shipment.status === "cancelled") {
    throw new HTTPException(400, {
      message: `Cannot cancel a shipment that is already ${shipment.status}`,
    });
  }

  const [updated] = await db
    .update(shipments)
    .set({ status: "cancelled" })
    .where(and(eq(shipments.id, shipmentId), eq(shipments.organizationId, orgId)))
    .returning();

  return formatShipment(updated);
}

export async function assignDriver(
  shipmentId: string,
  driverUserId: string,
  orgId: string,
) {
  await getShipmentById(shipmentId, orgId);

  const [driverMembership] = await db
    .select()
    .from(member)
    .where(
      and(
        eq(member.userId, driverUserId),
        eq(member.organizationId, orgId),
        eq(member.role, "driver"),
      ),
    )
    .limit(1);

  if (!driverMembership) {
    throw new HTTPException(404, { message: "Driver not found in this organization" });
  }

  const [updated] = await db
    .update(shipments)
    .set({ driverUserId, status: "assigned" })
    .where(and(eq(shipments.id, shipmentId), eq(shipments.organizationId, orgId)))
    .returning();

  return formatShipment(updated);
}
