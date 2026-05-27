import { Hono } from "hono";
import { sessionMiddleware, type AppEnv } from "@/shared/middleware/auth.middleware";
import { registerDeliveryPartner, addLocation, removeLocation, getDriver } from "./drivers.service";
import type { DriverLocationCreate } from "./drivers.types";

export const driversRoutes = new Hono<AppEnv>();

driversRoutes.use(sessionMiddleware);

driversRoutes.post("/register", async (c) => {
  const user = c.get("user");
  const result = await registerDeliveryPartner(user.id, user.userType);
  return c.json(result, 201);
});

driversRoutes.post("/me/locations", async (c) => {
  const user = c.get("user");
  const driver = await getDriver(user.id);
  const body = await c.req.json<DriverLocationCreate>();
  const location = await addLocation(driver.id, body);
  return c.json(location, 201);
});

driversRoutes.delete("/me/locations/:locationId", async (c) => {
  const user = c.get("user");
  const driver = await getDriver(user.id);
  await removeLocation(driver.id, c.req.param("locationId"));
  return c.body(null, 204);
});
