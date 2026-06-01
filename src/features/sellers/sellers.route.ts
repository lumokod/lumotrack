import { Hono } from "hono";
import { sessionMiddleware, type AppEnv } from "@/shared/middleware/auth.middleware";
import { registerSeller } from "./sellers.service";

export const sellersRoutes = new Hono<AppEnv>();

sellersRoutes.use(sessionMiddleware);

sellersRoutes.post("/register", async (c) => {
  const user = c.get("user");
  const result = await registerSeller(user.id, user.role as any);
  return c.json(result, 201);
});
