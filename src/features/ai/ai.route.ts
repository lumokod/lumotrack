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
  const session = c.get("session");
  const { question } = await c.req.json<{ question: string }>();
  const answer = await chat(question, session.activeOrganizationId!);
  return c.json({ answer });
});
