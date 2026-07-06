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
  toggleAvailability,
} from "./drivers.service";
import type { DriverLocationCreate } from "./drivers.types";
import { parseTrackingPing } from "./drivers.validation";
import { paginationSchema } from "@/features/shipments/shipments.validation";
import { idParamSchema } from "@/shared/validations/common";
import { z } from "zod";
import { upgradeWebSocket } from "hono/bun";
import { publishTracking } from "@/lib/tracking";

// Pings arriving faster than this are dropped — GPS clients have no business
// updating more than once per second.
const MIN_PING_INTERVAL_MS = 1_000;

export const driversRoutes = new Hono<AppEnv>();

driversRoutes.use(sessionMiddleware);
driversRoutes.use(requireActiveOrg);

driversRoutes.patch(
  "/me/availability",
  sValidator("json", z.object({ isAvailable: z.boolean() })),
  async (c) => {
    const user = c.get("user");
    const session = c.get("session");
    const { isAvailable } = c.req.valid("json");
    const profile = await toggleAvailability(user.id, session.activeOrganizationId!, isAvailable);
    return c.json(profile);
  },
);

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
  "/me/tracking",
  requirePermission({ location: ["create"] }),
  upgradeWebSocket((c) => {
    const user: AppEnv["Variables"]["user"] = c.get("user");
    const driverId = user.id;
    let lastPingAt = 0;

    return {
      onMessage(event, ws) {
        const now = Date.now();
        if (now - lastPingAt < MIN_PING_INTERVAL_MS) return;

        const ping = parseTrackingPing(event.data);
        if (!ping) {
          ws.send(
            JSON.stringify({
              type: "error",
              message: "Invalid ping — expected { latitude, longitude }",
            }),
          );
          return;
        }

        lastPingAt = now;
        void publishTracking({
          type: "location",
          driverId,
          latitude: ping.latitude,
          longitude: ping.longitude,
          timestamp: new Date().toISOString(),
        });
      },
      onClose() {
        void publishTracking({
          type: "offline",
          driverId,
          timestamp: new Date().toISOString(),
        });
      },
    };
  }),
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
