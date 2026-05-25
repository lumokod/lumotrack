import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { auth } from "@/lib/auth";
import { registerDeliveryPartner } from "./delivery-partner.service";

export const deliveryPartnerRoutes = new Hono();

deliveryPartnerRoutes.post("/register", async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!session) {
    throw new HTTPException(401, { message: "Unauthorized" });
  }

  const result = await registerDeliveryPartner(session.user.id, session.user.userType);

  return c.json(result, 201);
});
