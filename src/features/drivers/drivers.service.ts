import { and, eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { auth } from "@/lib/auth";
import { db } from "@/core/db";
import { deliveryPartners, deliveryPartnerLocations, user } from "@/db/schema";
import type { DriverLocationCreate } from "./drivers.types";

export async function getDriverFromSession(headers: Headers) {
  const session = await auth.api.getSession({ headers });
  if (!session) {
    throw new HTTPException(401, { message: "Unauthorized" });
  }
  if (session.user.userType !== "delivery_partner") {
    throw new HTTPException(403, {
      message: "Only drivers can access this resource",
    });
  }
  const [driver] = await db
    .select()
    .from(deliveryPartners)
    .where(eq(deliveryPartners.userId, session.user.id))
    .limit(1);
  if (!driver) {
    throw new HTTPException(404, { message: "Driver profile not found" });
  }
  return driver;
}

export async function registerDeliveryPartner(
  userId: string,
  userType: string | null | undefined,
) {
  if (userType) {
    throw new HTTPException(409, {
      message: "User already has a role assigned",
    });
  }

  const [existing] = await db
    .select()
    .from(deliveryPartners)
    .where(eq(deliveryPartners.userId, userId))
    .limit(1);

  if (existing) {
    throw new HTTPException(409, {
      message: "Already registered as a delivery partner",
    });
  }

  const { deliveryPartner, updatedUser } = await db.transaction(async (tx) => {
    const [newPartner] = await tx
      .insert(deliveryPartners)
      .values({ userId })
      .returning();
    const [updatedUser] = await tx
      .update(user)
      .set({ userType: "delivery_partner" })
      .where(eq(user.id, userId))
      .returning({
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        userType: user.userType,
      });
    return { deliveryPartner: newPartner, updatedUser };
  });

  return { deliveryPartner, user: updatedUser };
}

export async function addLocation(
  driverId: string,
  data: DriverLocationCreate,
) {
  const [location] = await db
    .insert(deliveryPartnerLocations)
    .values({
      deliveryPartnerId: driverId,
      location: { x: data.longitude, y: data.latitude },
      label: data.label,
    })
    .returning();
  return location;
}

export async function removeLocation(driverId: string, locationId: string) {
  const [existing] = await db
    .select()
    .from(deliveryPartnerLocations)
    .where(
      and(
        eq(deliveryPartnerLocations.id, locationId),
        eq(deliveryPartnerLocations.deliveryPartnerId, driverId),
      ),
    )
    .limit(1);

  if (!existing) {
    throw new HTTPException(404, { message: "Location not found" });
  }

  const [deleted] = await db
    .delete(deliveryPartnerLocations)
    .where(
      and(
        eq(deliveryPartnerLocations.id, locationId),
        eq(deliveryPartnerLocations.deliveryPartnerId, driverId),
      ),
    )
    .returning();
  return deleted;
}
