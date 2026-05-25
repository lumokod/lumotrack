import { Hono } from "hono";
import { auth } from "@/lib/auth";
import { registerSeller } from "./seller.service";

export const sellerRoutes = new Hono();

sellerRoutes.post("/register", async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!session) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const result = await registerSeller(session.user.id);

  return c.json(result, 201);
});
