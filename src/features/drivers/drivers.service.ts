import { and, eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { db } from "@/core/db";
import { drivers, driverLocations, user, shipments } from "@/db/schema";
import type { DriverLocationCreate } from "./drivers.types";
import type { UserRole } from "@/features/auth/auth.types";
import { formatShipment, paginateShipments } from "@/features/shipments/shipments.util";

export async function getDriver(userId: string) {
  const [driver] = await db
    .select()
    .from(drivers)
    .where(eq(drivers.userId, userId))
    .limit(1);
  if (!driver) {
    throw new HTTPException(404, { message: "Driver profile not found" });
  }
  return driver;
}

export async function registerDeliveryPartner(
  userId: string,
  role: UserRole | null | undefined,
) {
  if (role !== "user") {
    throw new HTTPException(409, {
      message: "User already has a role assigned",
    });
  }

  const [existing] = await db
    .select()
    .from(drivers)
    .where(eq(drivers.userId, userId))
    .limit(1);

  if (existing) {
    throw new HTTPException(409, {
      message: "Already registered as a driver",
    });
  }

  const { driver, updatedUser } = await db.transaction(async (tx) => {
    const [newDriver] = await tx.insert(drivers).values({ userId }).returning();
    const [updatedUser] = await tx
      .update(user)
      .set({ role: "driver" })
      .where(eq(user.id, userId))
      .returning({
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        role: user.role,
      });
    return { driver: newDriver, updatedUser };
  });

  return { driver, user: updatedUser };
}

export async function addLocation(
  driverId: string,
  data: DriverLocationCreate,
) {
  const [location] = await db
    .insert(driverLocations)
    .values({
      driverId: driverId,
      location: { x: data.longitude, y: data.latitude },
      label: data.label,
    })
    .returning();
  return location;
}

export async function getDriverShipments(driverId: string, cursor?: string) {
  return paginateShipments([eq(shipments.driverId, driverId)], cursor);
}

export async function getDriverShipmentById(driverId: string, shipmentId: string) {
  const [shipment] = await db
    .select()
    .from(shipments)
    .where(and(eq(shipments.id, shipmentId), eq(shipments.driverId, driverId)))
    .limit(1);

  if (!shipment) {
    throw new HTTPException(404, { message: "Shipment not found" });
  }

  return formatShipment(shipment);
}

export async function removeLocation(driverId: string, locationId: string) {
  const [existing] = await db
    .select()
    .from(driverLocations)
    .where(
      and(
        eq(driverLocations.id, locationId),
        eq(driverLocations.driverId, driverId),
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
        eq(driverLocations.driverId, driverId),
      ),
    )
    .returning();
  return deleted;
}
