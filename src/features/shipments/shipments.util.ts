import { and, asc, gt, type SQL } from "drizzle-orm";
import { db } from "@/core/db";
import { shipments } from "@/db/schema";

export const PAGE_LIMIT = 20;

export function formatShipment(shipment: typeof shipments.$inferSelect) {
  const { destination, ...rest } = shipment;
  return { ...rest, destination: { longitude: destination.x, latitude: destination.y } };
}

export async function paginateShipments(conditions: SQL[], cursor?: string) {
  const rows = await db
    .select()
    .from(shipments)
    .where(and(...conditions, cursor ? gt(shipments.id, cursor) : undefined))
    .orderBy(asc(shipments.id))
    .limit(PAGE_LIMIT + 1);

  const hasNextPage = rows.length > PAGE_LIMIT;
  const data = hasNextPage ? rows.slice(0, PAGE_LIMIT) : rows;
  return { data: data.map(formatShipment), nextCursor: hasNextPage ? data[data.length - 1].id : null };
}
