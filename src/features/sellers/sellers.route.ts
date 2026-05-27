import { Hono } from "hono";
import { auth } from "@/lib/auth";
import { registerSeller } from "./sellers.service";

export const sellersRoutes = new Hono();

sellersRoutes.post("/register", async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!session) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const result = await registerSeller(session.user.id, session.user.userType);

  return c.json(result, 201);
});
