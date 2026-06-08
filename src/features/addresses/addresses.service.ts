import { and, eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { uuidv7 } from "uuidv7";
import { db } from "@/core/db";
import { addresses } from "@/db/schema";
import type { CreateAddressInput } from "./addresses.types";

export async function getOrgAddresses(orgId: string) {
  return db.select().from(addresses).where(eq(addresses.orgId, orgId));
}

export async function createAddress(data: CreateAddressInput, orgId: string) {
  const [address] = await db
    .insert(addresses)
    .values({ id: uuidv7(), ...data, orgId })
    .returning();
  return address;
}

export async function deleteAddress(addressId: string, orgId: string) {
  const [existing] = await db
    .select()
    .from(addresses)
    .where(and(eq(addresses.id, addressId), eq(addresses.orgId, orgId)))
    .limit(1);

  if (!existing) {
    throw new HTTPException(404, { message: "Address not found" });
  }

  await db
    .delete(addresses)
    .where(and(eq(addresses.id, addressId), eq(addresses.orgId, orgId)));
}
