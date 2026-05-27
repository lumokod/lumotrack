import { Hono } from "hono";
import { sessionMiddleware, requireUserType, type AppEnv } from "@/shared/middleware/auth.middleware";
import { getSeller } from "@/features/sellers/sellers.service";
import { chat } from "./ai.service";

export const aiRoutes = new Hono<AppEnv>();

aiRoutes.use(sessionMiddleware);
aiRoutes.use(requireUserType("seller"));

aiRoutes.post("/chat", async (c) => {
  const user = c.get("user");
  const seller = await getSeller(user.id);
  const { question } = await c.req.json<{ question: string }>();
  const answer = await chat(question, seller.id);
  return c.json({ answer });
});
