import { Hono } from "hono";
import { sValidator } from "@hono/standard-validator";
import { sessionMiddleware, requireRole, type AppEnv } from "@/shared/middleware/auth.middleware";
import { registerDeliveryPartner, addLocation, removeLocation, getDriver, getDriverShipments, getDriverShipmentById } from "./drivers.service";
import type { DriverLocationCreate } from "./drivers.types";
import { paginationSchema } from "@/features/shipments/shipments.validation";
import { idParamSchema } from "@/shared/validators/common";

export const driversRoutes = new Hono<AppEnv>();

driversRoutes.use(sessionMiddleware);

driversRoutes.post("/register", async (c) => {
  const user = c.get("user");
  const result = await registerDeliveryPartner(user.id, user.role as any);
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

driversRoutes.get(
  "/me/shipments",
  requireRole("driver"),
  sValidator("query", paginationSchema),
  async (c) => {
    const { cursor } = c.req.valid("query");
    const user = c.get("user");
    const driver = await getDriver(user.id);
    const result = await getDriverShipments(driver.id, cursor);
    return c.json(result);
  },
);

driversRoutes.get(
  "/me/shipments/:id",
  requireRole("driver"),
  sValidator("param", idParamSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const user = c.get("user");
    const driver = await getDriver(user.id);
    const shipment = await getDriverShipmentById(driver.id, id);
    return c.json(shipment);
  },
);
