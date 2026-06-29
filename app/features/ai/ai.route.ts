import { Hono } from "hono";
import {
  sessionMiddleware,
  requireActiveOrg,
  requirePermission,
  type AppEnv,
} from "@/shared/middleware/auth.middleware";
import { chat } from "./ai.service";

export const aiRoutes = new Hono<AppEnv>();

aiRoutes.use(sessionMiddleware);
aiRoutes.use(requireActiveOrg);

aiRoutes.post(
  "/chat",
  requirePermission({ shipment: ["create"] }),
  async (c) => {
    const { question } = await c.req.json<{ question: string }>();
    const organizationId = c.get("session").activeOrganizationId!;
    const result = await chat(question, organizationId);
    return c.json(result);
  },
);
