import { and, eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { db } from "@/core/db";
import { driverLocations, member, shipments, user } from "@/db/schema";
import type { DriverLocationCreate } from "./drivers.types";
import { formatShipment, paginateShipments } from "@/features/shipments/shipments.util";

export async function getOrgDrivers(orgId: string) {
  return db
    .select({ id: user.id, name: user.name, email: user.email })
    .from(member)
    .innerJoin(user, eq(member.userId, user.id))
    .where(and(eq(member.organizationId, orgId), eq(member.role, "driver")));
}

export async function addLocation(userId: string, data: DriverLocationCreate) {
  const [location] = await db
    .insert(driverLocations)
    .values({
      userId,
      location: { x: data.longitude, y: data.latitude },
      label: data.label,
    })
    .returning();
  return location;
}

export async function getDriverShipments(userId: string, cursor?: string) {
  return paginateShipments([eq(shipments.driverUserId, userId)], cursor);
}

export async function getDriverShipmentById(userId: string, shipmentId: string) {
  const [shipment] = await db
    .select()
    .from(shipments)
    .where(and(eq(shipments.id, shipmentId), eq(shipments.driverUserId, userId)))
    .limit(1);

  if (!shipment) {
    throw new HTTPException(404, { message: "Shipment not found" });
  }

  return formatShipment(shipment);
}

export async function removeLocation(userId: string, locationId: string) {
  const [existing] = await db
    .select()
    .from(driverLocations)
    .where(
      and(
        eq(driverLocations.id, locationId),
        eq(driverLocations.userId, userId),
      ),
    )
    .limit(1);

  if (!existing) {
    throw new HTTPException(404, { message: "Location not found" });
  }

  const [deleted] = await db
    .delete(driverLocations)
    .where(
      and(
        eq(driverLocations.id, locationId),
        eq(driverLocations.userId, userId),
      ),
    )
    .returning();
  return deleted;
}
