import { Hono } from "hono";
import {
  sessionMiddleware,
  requireOrgRole,
  type AppEnv,
} from "@/shared/middleware/auth.middleware";
import { chat } from "./ai.service";

export const aiRoutes = new Hono<AppEnv>();

aiRoutes.use(sessionMiddleware);
aiRoutes.use(requireOrgRole("owner", "seller"));

aiRoutes.post("/chat", async (c) => {
  const { question } = await c.req.json<{ question: string }>();
  const organizationId = c.get("user").organizationId!;
  const answer = await chat(question, organizationId);
  return c.json({ answer });
});
