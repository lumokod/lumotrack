import { Hono } from "hono";
import {
  getAllShipments,
  getShipmentById,
  getShipmentsByStatus,
  createShipment,
  updateShipment,
  deleteShipment,
  assignDriver,
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
  requireOrgRole,
  type AppEnv,
} from "@/shared/middleware/auth.middleware";
import { sValidator } from "@hono/standard-validator";
import { idParamSchema } from "@/shared/validators/common";

export const shipmentsRoutes = new Hono<AppEnv>();

shipmentsRoutes.use(sessionMiddleware);
shipmentsRoutes.use(requireOrgRole("owner", "seller"));

shipmentsRoutes.get("/", sValidator("query", paginationSchema), async (c) => {
  const { cursor } = c.req.valid("query");
  const session = c.get("session");
  const result = await getAllShipments(session.activeOrganizationId!, cursor);
  return c.json(result);
});

shipmentsRoutes.get(
  "/status/:status",
  sValidator("param", shipmentStatusSchema),
  sValidator("query", paginationSchema),
  async (c) => {
    const status = c.req.valid("param");
    const { cursor } = c.req.valid("query");
    const session = c.get("session");
    const result = await getShipmentsByStatus(
      status as ShipmentStatus,
      session.activeOrganizationId!,
      cursor,
    );
    return c.json(result);
  },
);

shipmentsRoutes.get("/:id", sValidator("param", idParamSchema), async (c) => {
  const { id } = c.req.valid("param");
  const session = c.get("session");
  const shipment = await getShipmentById(id, session.activeOrganizationId!);
  return c.json(shipment);
});

shipmentsRoutes.post(
  "/",
  sValidator("json", createShipmentSchema),
  async (c) => {
    const body = c.req.valid("json");
    const session = c.get("session");
    const shipment = await createShipment(body, session.activeOrganizationId!);
    return c.json(shipment, 201);
  },
);

shipmentsRoutes.patch(
  "/:id",
  sValidator("param", idParamSchema),
  sValidator("json", updateShipmentSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");
    const session = c.get("session");
    const shipment = await updateShipment(id, body, session.activeOrganizationId!);
    return c.json(shipment);
  },
);

shipmentsRoutes.delete(
  "/:id",
  sValidator("param", idParamSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const session = c.get("session");
    await deleteShipment(id, session.activeOrganizationId!);
    return c.json({ message: "Shipment deleted successfully" });
  },
);

shipmentsRoutes.patch(
  "/:id/assign",
  sValidator("param", idParamSchema),
  sValidator("json", assignDriverSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const { driverId } = c.req.valid("json");
    const session = c.get("session");
    const shipment = await assignDriver(id, driverId, session.activeOrganizationId!);
    return c.json(shipment);
  },
);
