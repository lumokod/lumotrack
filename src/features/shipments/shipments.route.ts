import { Hono } from "hono";
import {
  getAllShipments,
  getShipmentById,
  getShipmentWithTimeline,
  getShipmentsByStatus,
  createShipment,
  updateShipment,
  deleteShipment,
  assignDriver,
  cancelShipment,
} from "./shipments.service";
import {
  createShipmentSchema,
  updateShipmentSchema,
  shipmentStatusSchema,
  paginationSchema,
  assignDriverSchema,
} from "./shipments.validation";
import type { ShipmentStatus } from "./shipments.types";
import {
  sessionMiddleware,
  requireActiveOrg,
  requirePermission,
  type AppEnv,
} from "@/shared/middleware/auth.middleware";
import { sValidator } from "@hono/standard-validator";
import { idParamSchema } from "@/shared/validations/common";

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

shipmentsRoutes.post(
  "/",
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

shipmentsRoutes.delete(
  "/:id",
  requirePermission({ shipment: ["delete"] }),
  sValidator("param", idParamSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const organizationId = c.get("session").activeOrganizationId!;
    await deleteShipment(id, organizationId);
    return c.json({ message: "Shipment deleted successfully" });
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
