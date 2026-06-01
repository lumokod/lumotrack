import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { shipmentStatusEnum } from "@/db/schema";
import {
  getAllShipments,
  getShipmentById,
  getShipmentsByStatus,
  createShipment,
  updateShipment,
  deleteShipment,
} from "./shipments.service";
import {
  createShipmentSchema,
  updateShipmentSchema,
  shipmentStatusSchema,
  paginationSchema,
} from "./shipments.validation";
import type { ShipmentStatus } from "./shipments.types";
import {
  sessionMiddleware,
  requireUserType,
  type AppEnv,
} from "@/shared/middleware/auth.middleware";
import { getSeller } from "@/features/sellers/sellers.service";
import { sValidator } from "@hono/standard-validator";
import { z } from "zod";

export const shipmentsRoutes = new Hono<AppEnv>();

shipmentsRoutes.use(sessionMiddleware);
shipmentsRoutes.use(requireUserType("seller"));

shipmentsRoutes.get(
  "/",
  sValidator("query", paginationSchema),
  async (c) => {
    const { cursor } = c.req.valid("query");
    const user = c.get("user");
    const seller = await getSeller(user.id);
    const result = await getAllShipments(seller.id, cursor);
    return c.json(result);
  },
);

shipmentsRoutes.get(
  "/status/:status",
  sValidator("param", shipmentStatusSchema),
  sValidator("query", paginationSchema),
  async (c) => {
    const status = c.req.valid("param");
    const { cursor } = c.req.valid("query");
    const user = c.get("user");
    const seller = await getSeller(user.id);
    const result = await getShipmentsByStatus(status as ShipmentStatus, seller.id, cursor);
    return c.json(result);
  },
);

shipmentsRoutes.get("/:id", sValidator("param", z.uuidv7()), async (c) => {
  const id = c.req.valid("param");
  const user = c.get("user");
  const seller = await getSeller(user.id);
  const shipment = await getShipmentById(id, seller.id);
  if (!shipment) {
    throw new HTTPException(404, { message: "Shipment not found" });
  }
  return c.json(shipment);
});

shipmentsRoutes.post(
  "/",
  sValidator("json", createShipmentSchema),
  async (c) => {
    const body = c.req.valid("json");
    const user = c.get("user");
    const seller = await getSeller(user.id);
    const shipment = await createShipment(body, seller.id);
    return c.json(shipment, 201);
  },
);

shipmentsRoutes.patch(
  "/:id",
  sValidator("param", z.uuidv7()),
  sValidator("json", updateShipmentSchema),
  async (c) => {
    const id = c.req.valid("param");
    const body = c.req.valid("json");
    const user = c.get("user");
    const seller = await getSeller(user.id);
    const shipment = await updateShipment(id, body, seller.id);
    if (!shipment) {
      throw new HTTPException(404, { message: "Shipment not found" });
    }
    return c.json(shipment);
  },
);

shipmentsRoutes.delete("/:id", sValidator("param", z.uuidv7()), async (c) => {
  const id = c.req.valid("param");
  const user = c.get("user");
  const seller = await getSeller(user.id);
  await deleteShipment(id, seller.id);

  return c.json({ message: "Shipment deleted successfully" });
});
