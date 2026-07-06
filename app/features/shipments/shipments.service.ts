import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/core/db";
import {
  shipments,
  member,
  events,
  driverProfiles,
  tags,
  shipmentTags,
} from "@/db/schema";
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
    .where(
      and(eq(shipments.id, shipmentId), eq(shipments.organizationId, orgId)),
    )
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

export async function getShipmentsByTags(
  tagIds: string[],
  orgId: string,
  cursor?: string,
) {
  const uniqueTagIds = [...new Set(tagIds)];

  // Every tag must belong to this org — no filtering by another org's tag.
  const ownedTags = await db
    .select({ id: tags.id })
    .from(tags)
    .where(and(inArray(tags.id, uniqueTagIds), eq(tags.organizationId, orgId)));

  if (ownedTags.length !== uniqueTagIds.length) {
    throw new HTTPException(404, {
      message: "One or more tags do not exist in this organization",
    });
  }

  // ANY/OR semantics: a shipment matches if it carries at least one of the
  // tags. Subquery (not a join) keeps one row per shipment even when several
  // tags match, and preserves the id-based cursor pagination.
  return paginateShipments(
    [
      eq(shipments.organizationId, orgId),
      inArray(
        shipments.id,
        db
          .select({ id: shipmentTags.shipmentId })
          .from(shipmentTags)
          .where(inArray(shipmentTags.tagId, uniqueTagIds)),
      ),
    ],
    cursor,
  );
}

export async function getShipmentWithTimeline(
  shipmentId: string,
  orgId: string,
) {
  const shipment = await db.query.shipments.findFirst({
    where: and(
      eq(shipments.id, shipmentId),
      eq(shipments.organizationId, orgId),
    ),
    with: {
      events: { orderBy: asc(events.createdAt) },
      shipmentTags: { with: { tag: true } },
    },
  });

  if (!shipment) {
    throw new HTTPException(404, { message: "Shipment not found" });
  }

  const { destination, shipmentTags, ...rest } = shipment;
  return {
    ...rest,
    destination: { longitude: destination.x, latitude: destination.y },
    tags: shipmentTags.map((row) => row.tag),
  };
}

const TRACKABLE_STATUSES: ShipmentStatus[] = [
  "assigned",
  "picked_up",
  "in_transit",
  "out_for_delivery",
];

/** Resolve which driver a seller may live-track for this shipment, or throw. */
export async function getTrackedDriverId(shipmentId: string, orgId: string) {
  const shipment = await getShipmentById(shipmentId, orgId);

  if (!shipment.driverUserId) {
    throw new HTTPException(400, {
      message: "Shipment has no assigned driver to track",
    });
  }

  if (!TRACKABLE_STATUSES.includes(shipment.status)) {
    throw new HTTPException(400, {
      message: `Live tracking is not available for a ${shipment.status} shipment`,
    });
  }

  return shipment.driverUserId;
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
    .where(
      and(eq(shipments.id, shipmentId), eq(shipments.organizationId, orgId)),
    )
    .returning();
  return updated ? formatShipment(updated) : null;
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
    .where(
      and(eq(shipments.id, shipmentId), eq(shipments.organizationId, orgId)),
    )
    .returning();

  return formatShipment(updated);
}

export async function assignDriver(
  shipmentId: string,
  driverUserId: string,
  orgId: string,
) {
  const shipment = await getShipmentById(shipmentId, orgId);

  if (!shipment.originAddressId) {
    throw new HTTPException(400, { message: "Shipment must have a pickup address before assigning a driver" });
  }

  if (!shipment.clientContactEmail && !shipment.clientContactPhone) {
    throw new HTTPException(400, { message: "Shipment must have a client contact email or phone before assigning a driver" });
  }

  const [[driverMembership], [driverProfile]] = await Promise.all([
    db
      .select()
      .from(member)
      .where(
        and(
          eq(member.userId, driverUserId),
          eq(member.organizationId, orgId),
          eq(member.role, "driver"),
        ),
      )
      .limit(1),
    db
      .select()
      .from(driverProfiles)
      .where(
        and(
          eq(driverProfiles.userId, driverUserId),
          eq(driverProfiles.organizationId, orgId),
        ),
      )
      .limit(1),
  ]);

  if (!driverMembership) {
    throw new HTTPException(404, { message: "Driver not found in this organization" });
  }

  if (!driverProfile?.isAvailable) {
    throw new HTTPException(400, { message: "Driver is not available" });
  }

  const [updated] = await db
    .update(shipments)
    .set({ driverUserId, status: "assigned" })
    .where(
      and(eq(shipments.id, shipmentId), eq(shipments.organizationId, orgId)),
    )
    .returning();

  return formatShipment(updated);
}
