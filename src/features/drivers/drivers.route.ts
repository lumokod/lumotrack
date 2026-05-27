import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { auth } from "@/lib/auth";
import { registerDeliveryPartner, addLocation, removeLocation, getDriverFromSession } from "./drivers.service";
import type { DriverLocationCreate } from "./drivers.types";

export const driversRoutes = new Hono();

driversRoutes.post("/register", async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!session) {
    throw new HTTPException(401, { message: "Unauthorized" });
  }

  const result = await registerDeliveryPartner(session.user.id, session.user.userType);

  return c.json(result, 201);
});

driversRoutes.post("/me/locations", async (c) => {
  const driver = await getDriverFromSession(c.req.raw.headers);
  const body = await c.req.json<DriverLocationCreate>();
  const location = await addLocation(driver.id, body);
  return c.json(location, 201);
});

driversRoutes.delete("/me/locations/:locationId", async (c) => {
  const driver = await getDriverFromSession(c.req.raw.headers);
  await removeLocation(driver.id, c.req.param("locationId"));
  return c.body(null, 204);
});
