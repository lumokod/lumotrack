import { and, eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { uuidv7 } from "uuidv7";
import { db } from "@/core/db";
import { addresses } from "@/db/schema";
import type { CreateAddressInput } from "./addresses.types";

export async function getOrgAddresses(organizationId: string) {
  return db.select().from(addresses).where(eq(addresses.organizationId, organizationId));
}

export async function createAddress(data: CreateAddressInput, organizationId: string) {
  const [address] = await db
    .insert(addresses)
    .values({ id: uuidv7(), ...data, organizationId })
    .returning();
  return address;
}

export async function deleteAddress(addressId: string, organizationId: string) {
  const [existing] = await db
    .select()
    .from(addresses)
    .where(and(eq(addresses.id, addressId), eq(addresses.organizationId, organizationId)))
    .limit(1);

  if (!existing) {
    throw new HTTPException(404, { message: "Address not found" });
  }

  await db
    .delete(addresses)
    .where(and(eq(addresses.id, addressId), eq(addresses.organizationId, organizationId)));
}
