import { Hono } from "hono";
import { sValidator } from "@hono/standard-validator";
import { submitReview, getOrgReviews } from "./reviews.service";
import { submitReviewSchema, reviewQuerySchema } from "./reviews.validation";
import {
  sessionMiddleware,
  requireActiveOrg,
  requirePermission,
  type AppEnv,
} from "@/shared/middleware/auth.middleware";

export const reviewsRoutes = new Hono<AppEnv>();

// Public — the customer submits a review via the signed link (no session).
// Authorization is the HMAC token in the body, verified in the service.
reviewsRoutes.post("/", sValidator("json", submitReviewSchema), async (c) => {
  const body = c.req.valid("json");
  const review = await submitReview(body);
  return c.json(review, 201);
});

// Authenticated — org members view reviews for their organization.
reviewsRoutes.get(
  "/",
  sessionMiddleware,
  requireActiveOrg,
  requirePermission({ shipment: ["read"] }),
  sValidator("query", reviewQuerySchema),
  async (c) => {
    const { cursor } = c.req.valid("query");
    const orgId = c.get("session").activeOrganizationId!;
    const result = await getOrgReviews(orgId, cursor);
    return c.json(result);
  },
);
