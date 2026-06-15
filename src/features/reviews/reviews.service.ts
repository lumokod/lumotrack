import { and, desc, eq, lt } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { db } from "@/core/db";
import { reviews, shipments } from "@/db/schema";
import { verifyReviewToken } from "./review-link";
import type { SubmitReviewInput } from "./reviews.validation";

const PAGE_LIMIT = 20;

export async function submitReview(data: SubmitReviewInput) {
  if (!verifyReviewToken(data.shipmentId, data.token)) {
    throw new HTTPException(403, { message: "Invalid review link" });
  }

  const [shipment] = await db
    .select()
    .from(shipments)
    .where(eq(shipments.id, data.shipmentId))
    .limit(1);

  if (!shipment) {
    throw new HTTPException(404, { message: "Shipment not found" });
  }
  if (shipment.status !== "delivered") {
    throw new HTTPException(400, {
      message: "You can only review a delivered shipment",
    });
  }

  const existing = await db.query.reviews.findFirst({
    where: eq(reviews.shipmentId, data.shipmentId),
  });
  if (existing) {
    throw new HTTPException(409, {
      message: "A review has already been submitted for this shipment",
    });
  }

  const [review] = await db
    .insert(reviews)
    .values({
      shipmentId: shipment.id,
      organizationId: shipment.organizationId,
      driverUserId: shipment.driverUserId,
      rating: data.rating,
      comment: data.comment,
    })
    .returning();

  return review;
}

export async function getOrgReviews(orgId: string, cursor?: string) {
  const rows = await db
    .select()
    .from(reviews)
    .where(
      cursor
        ? and(eq(reviews.organizationId, orgId), lt(reviews.id, cursor))
        : eq(reviews.organizationId, orgId),
    )
    .orderBy(desc(reviews.id))
    .limit(PAGE_LIMIT + 1);

  const hasMore = rows.length > PAGE_LIMIT;
  const items = hasMore ? rows.slice(0, PAGE_LIMIT) : rows;
  return {
    items,
    nextCursor: hasMore ? items[items.length - 1].id : null,
  };
}
