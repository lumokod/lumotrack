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
} from "./shipments.validation";
import type { ShipmentStatus } from "./shipments.types";
import {
  sessionMiddleware,
  requireUserType,
  type AppEnv,
} from "@/shared/middleware/auth.middleware";
import { getSeller } from "@/features/sellers/sellers.service";

export const shipmentsRoutes = new Hono<AppEnv>();

shipmentsRoutes.use(sessionMiddleware);
shipmentsRoutes.use(requireUserType("seller"));

shipmentsRoutes.get("/", async (c) => {
  const user = c.get("user");
  const seller = await getSeller(user.id);
  const result = await getAllShipments(seller.id);
  return c.json(result);
});

shipmentsRoutes.get("/status/:status", async (c) => {
  const user = c.get("user");
  const statusParam = c.req.param("status");

  if (!(shipmentStatusEnum.enumValues as string[]).includes(statusParam)) {
    throw new HTTPException(422, {
      message: `Invalid status. Must be one of: ${shipmentStatusEnum.enumValues.join(", ")}`,
    });
  }

  const seller = await getSeller(user.id);
  const result = await getShipmentsByStatus(
    statusParam as ShipmentStatus,
    seller.id,
  );
  return c.json(result);
});

shipmentsRoutes.get("/:id", async (c) => {
  const user = c.get("user");
  const seller = await getSeller(user.id);
  const shipment = await getShipmentById(c.req.param("id"), seller.id);
  if (!shipment) {
    throw new HTTPException(404, { message: "Shipment not found" });
  }
  return c.json(shipment);
});

shipmentsRoutes.post("/", async (c) => {
  const user = c.get("user");
  const seller = await getSeller(user.id);
  const body = createShipmentSchema.parse(await c.req.json());
  const shipment = await createShipment(
    {
      longitude: body.longitude,
      latitude: body.latitude,
      content: body.content,
      weight: body.weight,
      estimatedDelivery: body.estimatedDelivery,
    },
    seller.id,
  );
  return c.json(shipment, 201);
});

shipmentsRoutes.patch("/:id", async (c) => {
  const user = c.get("user");
  const seller = await getSeller(user.id);
  const body = updateShipmentSchema.parse(await c.req.json());
  const shipment = await updateShipment(c.req.param("id"), body, seller.id);
  if (!shipment) {
    throw new HTTPException(404, { message: "Shipment not found" });
  }
  return c.json(shipment);
});

shipmentsRoutes.delete("/:id", async (c) => {
  const user = c.get("user");
  const seller = await getSeller(user.id);
  const shipment = await deleteShipment(c.req.param("id"), seller.id);
  if (!shipment) {
    throw new HTTPException(404, { message: "Shipment not found" });
  }
  return c.json(shipment);
});
