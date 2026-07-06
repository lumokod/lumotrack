import { Hono } from "hono";
import {
  getAllShipments,
  getShipmentWithTimeline,
  getShipmentsByStatus,
  getShipmentsByTags,
  getTrackedDriverId,
  createShipment,
  updateShipment,
  assignDriver,
  cancelShipment,
} from "./shipments.service";
import {
  createShipmentSchema,
  updateShipmentSchema,
  shipmentStatusSchema,
  paginationSchema,
  assignDriverSchema,
  shipmentsByTagsQuerySchema,
} from "./shipments.validation";
import type { ShipmentStatus } from "./shipments.types";
import {
  sessionMiddleware,
  requireActiveOrg,
  requirePermission,
  requireVerifiedOrg,
  type AppEnv,
} from "@/shared/middleware/auth.middleware";
import { sValidator } from "@hono/standard-validator";
import { idParamSchema } from "@/shared/validations/common";
import { getShipmentTags, setShipmentTags } from "@/features/tags/tags.service";
import { setShipmentTagsSchema } from "@/features/tags/tags.validation";
import { upgradeWebSocket } from "hono/bun";
import {
  getLastKnownLocation,
  subscribeToDriver,
  unsubscribeFromDriver,
  type TrackingHandler,
} from "@/lib/tracking";

export const shipmentsRoutes = new Hono<AppEnv>();

shipmentsRoutes.use(sessionMiddleware);
shipmentsRoutes.use(requireActiveOrg);

shipmentsRoutes.get(
  "/",
  requirePermission({ shipment: ["read"] }),
  sValidator("query", paginationSchema),
  async (c) => {
    const { cursor } = c.req.valid("query");
    const organizationId = c.get("session").activeOrganizationId!;
    const result = await getAllShipments(organizationId, cursor);
    return c.json(result);
  },
);

shipmentsRoutes.get(
  "/status/:status",
  requirePermission({ shipment: ["read"] }),
  sValidator("param", shipmentStatusSchema),
  sValidator("query", paginationSchema),
  async (c) => {
    const status = c.req.valid("param");
    const { cursor } = c.req.valid("query");
    const organizationId = c.get("session").activeOrganizationId!;
    const result = await getShipmentsByStatus(
      status as ShipmentStatus,
      organizationId,
      cursor,
    );
    return c.json(result);
  },
);

shipmentsRoutes.get(
  "/tags",
  requirePermission({ shipment: ["read"] }),
  sValidator("query", shipmentsByTagsQuerySchema),
  async (c) => {
    const { tagIds, cursor } = c.req.valid("query");
    const organizationId = c.get("session").activeOrganizationId!;
    const result = await getShipmentsByTags(tagIds, organizationId, cursor);
    return c.json(result);
  },
);

shipmentsRoutes.get(
  "/:id",
  requirePermission({ shipment: ["read"] }),
  sValidator("param", idParamSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const organizationId = c.get("session").activeOrganizationId!;
    const shipment = await getShipmentWithTimeline(id, organizationId);
    return c.json(shipment);
  },
);

shipmentsRoutes.get(
  "/:id/tracking",
  requirePermission({ shipment: ["read"] }),
  sValidator("param", idParamSchema),
  // Hono awaits createEvents before upgrading, so a throw here is a normal 4xx.
  upgradeWebSocket(async (c) => {
    const session: AppEnv["Variables"]["session"] = c.get("session");
    const driverId = await getTrackedDriverId(
      c.req.param("id")!,
      session.activeOrganizationId!,
    );

    let relay: TrackingHandler | undefined;
    let closed = false;

    return {
      async onOpen(_event, ws) {
        relay = (message) => ws.send(JSON.stringify(message));

        // Snapshot first, then live updates take over.
        const lastKnown = await getLastKnownLocation(driverId);
        if (lastKnown) ws.send(JSON.stringify(lastKnown));

        await subscribeToDriver(driverId, relay);
        // The socket may have closed while we were subscribing.
        if (closed) await unsubscribeFromDriver(driverId, relay);
      },
      async onClose() {
        closed = true;
        if (relay) await unsubscribeFromDriver(driverId, relay);
      },
    };
  }),
);

shipmentsRoutes.post(
  "/",
  requireVerifiedOrg,
  requirePermission({ shipment: ["create"] }),
  sValidator("json", createShipmentSchema),
  async (c) => {
    const body = c.req.valid("json");
    const organizationId = c.get("session").activeOrganizationId!;
    const shipment = await createShipment(body, organizationId);
    return c.json(shipment, 201);
  },
);

shipmentsRoutes.patch(
  "/:id",
  requirePermission({ shipment: ["update"] }),
  sValidator("param", idParamSchema),
  sValidator("json", updateShipmentSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");
    const organizationId = c.get("session").activeOrganizationId!;
    const shipment = await updateShipment(id, body, organizationId);
    return c.json(shipment);
  },
);

shipmentsRoutes.patch(
  "/:id/cancel",
  requirePermission({ shipment: ["update"] }),
  sValidator("param", idParamSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const organizationId = c.get("session").activeOrganizationId!;
    const shipment = await cancelShipment(id, organizationId);
    return c.json(shipment);
  },
);

shipmentsRoutes.get(
  "/:id/tags",
  requirePermission({ tag: ["read"] }),
  sValidator("param", idParamSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const organizationId = c.get("session").activeOrganizationId!;
    const tags = await getShipmentTags(id, organizationId);
    return c.json(tags);
  },
);

shipmentsRoutes.put(
  "/:id/tags",
  requirePermission({ tag: ["update"] }),
  sValidator("param", idParamSchema),
  sValidator("json", setShipmentTagsSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const { tagIds } = c.req.valid("json");
    const organizationId = c.get("session").activeOrganizationId!;
    const tags = await setShipmentTags(id, tagIds, organizationId);
    return c.json(tags);
  },
);

shipmentsRoutes.patch(
  "/:id/assign",
  requirePermission({ shipment: ["create"] }),
  sValidator("param", idParamSchema),
  sValidator("json", assignDriverSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const { driverId } = c.req.valid("json");
    const organizationId = c.get("session").activeOrganizationId!;
    const shipment = await assignDriver(id, driverId, organizationId);
    return c.json(shipment);
  },
);
