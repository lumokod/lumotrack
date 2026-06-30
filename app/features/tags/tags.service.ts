import { and, eq, inArray } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { uuidv7 } from "uuidv7";
import { db } from "@/core/db";
import { tags, shipmentTags, shipments } from "@/db/schema";
import type { CreateTagInput, UpdateTagInput } from "./tags.types";
import { isUniqueViolation } from "@/shared/db.util";

async function getTagOrThrow(tagId: string, orgId: string) {
  const [tag] = await db
    .select()
    .from(tags)
    .where(and(eq(tags.id, tagId), eq(tags.organizationId, orgId)))
    .limit(1);

  if (!tag) {
    throw new HTTPException(404, { message: "Tag not found" });
  }
  return tag;
}

async function assertShipmentInOrg(shipmentId: string, orgId: string) {
  const [shipment] = await db
    .select({ id: shipments.id })
    .from(shipments)
    .where(
      and(eq(shipments.id, shipmentId), eq(shipments.organizationId, orgId)),
    )
    .limit(1);

  if (!shipment) {
    throw new HTTPException(404, { message: "Shipment not found" });
  }
}

export async function getOrgTags(orgId: string) {
  return db.select().from(tags).where(eq(tags.organizationId, orgId));
}

export const DEFAULT_TAGS: CreateTagInput[] = [
  { name: "express", description: "Expedited delivery with priority handling" },
  { name: "fragile", description: "Handle with care — breakable contents" },
  {
    name: "temperature_controlled",
    description: "Requires temperature-controlled transport",
  },
  { name: "gift", description: "Gift shipment — handle presentation with care" },
  { name: "documents", description: "Contains documents or paperwork only" },
  { name: "return", description: "Return shipment headed back to the sender" },
];


export async function seedDefaultTags(orgId: string) {
  await db
    .insert(tags)
    .values(
      DEFAULT_TAGS.map((tag) => ({
        id: uuidv7(),
        ...tag,
        organizationId: orgId,
      })),
    )
    .onConflictDoNothing();
}

export async function createTag(data: CreateTagInput, orgId: string) {
  try {
    const [tag] = await db
      .insert(tags)
      .values({ id: uuidv7(), ...data, organizationId: orgId })
      .returning();
    return tag;
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new HTTPException(409, {
        message: `A tag named "${data.name}" already exists`,
      });
    }
    throw error;
  }
}

export async function updateTag(
  tagId: string,
  data: UpdateTagInput,
  orgId: string,
) {
  await getTagOrThrow(tagId, orgId);

  try {
    const [updated] = await db
      .update(tags)
      .set(data)
      .where(and(eq(tags.id, tagId), eq(tags.organizationId, orgId)))
      .returning();
    return updated;
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new HTTPException(409, {
        message: `A tag named "${data.name}" already exists`,
      });
    }
    throw error;
  }
}

export async function deleteTag(tagId: string, orgId: string) {
  await getTagOrThrow(tagId, orgId);
  // shipment_tags rows are removed via ON DELETE CASCADE.
  await db
    .delete(tags)
    .where(and(eq(tags.id, tagId), eq(tags.organizationId, orgId)));
}

export async function getShipmentTags(shipmentId: string, orgId: string) {
  await assertShipmentInOrg(shipmentId, orgId);

  const rows = await db
    .select()
    .from(shipmentTags)
    .innerJoin(tags, eq(shipmentTags.tagId, tags.id))
    .where(eq(shipmentTags.shipmentId, shipmentId));

  return rows.map((row) => row.tags);
}

// Replaces the full set of tags on a shipment (idempotent attach/detach).
export async function setShipmentTags(
  shipmentId: string,
  tagIds: string[],
  orgId: string,
) {
  await assertShipmentInOrg(shipmentId, orgId);

  const uniqueTagIds = [...new Set(tagIds)];

  if (uniqueTagIds.length > 0) {
    // Every tag must belong to the same org — no cross-org tagging.
    const ownedTags = await db
      .select({ id: tags.id })
      .from(tags)
      .where(
        and(inArray(tags.id, uniqueTagIds), eq(tags.organizationId, orgId)),
      );

    if (ownedTags.length !== uniqueTagIds.length) {
      throw new HTTPException(400, {
        message: "One or more tags do not exist in this organization",
      });
    }
  }

  await db.transaction(async (tx) => {
    await tx
      .delete(shipmentTags)
      .where(eq(shipmentTags.shipmentId, shipmentId));

    if (uniqueTagIds.length > 0) {
      await tx
        .insert(shipmentTags)
        .values(uniqueTagIds.map((tagId) => ({ shipmentId, tagId })));
    }
  });

  return getShipmentTags(shipmentId, orgId);
}
