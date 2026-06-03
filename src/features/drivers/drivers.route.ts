import { Hono } from "hono";
import { sValidator } from "@hono/standard-validator";
import {
  sessionMiddleware,
  requireActiveOrg,
  requirePermission,
  type AppEnv,
} from "@/shared/middleware/auth.middleware";
import {
  addLocation,
  removeLocation,
  getDriverShipments,
  getDriverShipmentById,
} from "./drivers.service";
import type { DriverLocationCreate } from "./drivers.types";
import { paginationSchema } from "@/features/shipments/shipments.validation";
import { idParamSchema } from "@/shared/validators/common";

export const driversRoutes = new Hono<AppEnv>();

driversRoutes.use(sessionMiddleware);
driversRoutes.use(requireActiveOrg);

driversRoutes.post(
  "/me/locations",
  requirePermission({ location: ["create"] }),
  async (c) => {
    const user = c.get("user");
    const body = await c.req.json<DriverLocationCreate>();
    const location = await addLocation(user.id, body);
    return c.json(location, 201);
  },
);

driversRoutes.delete(
  "/me/locations/:locationId",
  requirePermission({ location: ["delete"] }),
  async (c) => {
    const user = c.get("user");
    await removeLocation(user.id, c.req.param("locationId"));
    return c.body(null, 204);
  },
);

driversRoutes.get(
  "/me/shipments",
  requirePermission({ shipment: ["read"] }),
  sValidator("query", paginationSchema),
  async (c) => {
    const { cursor } = c.req.valid("query");
    const user = c.get("user");
    const result = await getDriverShipments(user.id, cursor);
    return c.json(result);
  },
);

driversRoutes.get(
  "/me/shipments/:id",
  requirePermission({ shipment: ["read"] }),
  sValidator("param", idParamSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const user = c.get("user");
    const shipment = await getDriverShipmentById(user.id, id);
    return c.json(shipment);
  },
);
