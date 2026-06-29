import { Hono } from "hono";
import { sValidator } from "@hono/standard-validator";
import {
  getVerification,
  getPendingVerifications,
  submitVerification,
  reviewVerification,
} from "./verification.service";
import {
  submitVerificationSchema,
  reviewVerificationSchema,
  orgIdParamSchema,
} from "./verification.validation";
import {
  sessionMiddleware,
  requireActiveOrg,
  requirePermission,
  requireAdmin,
  type AppEnv,
} from "@/shared/middleware/auth.middleware";

export const verificationRoutes = new Hono<AppEnv>();

verificationRoutes.use(sessionMiddleware);

// --- Admin: platform-level review ---

verificationRoutes.get("/pending", requireAdmin, async (c) => {
  const records = await getPendingVerifications();
  return c.json(records);
});

verificationRoutes.patch(
  "/:organizationId/review",
  requireAdmin,
  sValidator("param", orgIdParamSchema),
  sValidator("json", reviewVerificationSchema),
  async (c) => {
    const { organizationId } = c.req.valid("param");
    const body = c.req.valid("json");
    const reviewerId = c.get("user").id;
    const record = await reviewVerification(organizationId, reviewerId, body);
    return c.json(record);
  },
);

// --- Org owner: submit / view own KYB ---

verificationRoutes.get(
  "/",
  requireActiveOrg,
  requirePermission({ organization: ["read"] }),
  async (c) => {
    const orgId = c.get("session").activeOrganizationId!;
    const record = await getVerification(orgId);
    return c.json(record);
  },
);

verificationRoutes.post(
  "/",
  requireActiveOrg,
  requirePermission({ organization: ["update"] }),
  sValidator("json", submitVerificationSchema),
  async (c) => {
    const orgId = c.get("session").activeOrganizationId!;
    const body = c.req.valid("json");
    const record = await submitVerification(orgId, body);
    return c.json(record, 201);
  },
);
