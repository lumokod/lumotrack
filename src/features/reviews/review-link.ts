import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/core/env";

// Stateless review authorization: the link carries the shipmentId plus an
// HMAC over it. Anyone with the signed link can submit exactly one review
// (the unique constraint on reviews.shipmentId enforces single-use). No token
// is persisted — the signature proves the link came from us.
function sign(shipmentId: string): string {
  return createHmac("sha256", env.BETTER_AUTH_SECRET)
    .update(`review:${shipmentId}`)
    .digest("base64url");
}

export function verifyReviewToken(shipmentId: string, token: string): boolean {
  const expected = Buffer.from(sign(shipmentId));
  const provided = Buffer.from(token);
  if (expected.length !== provided.length) return false;
  return timingSafeEqual(expected, provided);
}

export function buildReviewUrl(shipmentId: string): string {
  const base = env.BETTER_AUTH_URL.replace(/\/$/, "");
  return `${base}/review?shipment=${shipmentId}&token=${sign(shipmentId)}`;
}
