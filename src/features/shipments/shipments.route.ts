import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/core/db";
import { sellers, shipmentStatusEnum } from "@/db/schema";
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

export const shipmentsRoutes = new Hono();

async function getSellerFromSession(headers: Headers) {
  const session = await auth.api.getSession({ headers });
  if (!session) {
    throw new HTTPException(401, { message: "Unauthorized" });
  }
  if (session.user.userType !== "seller") {
    throw new HTTPException(403, {
      message: "Only sellers can access shipments",
    });
  }
  const [seller] = await db
    .select()
    .from(sellers)
    .where(eq(sellers.userId, session.user.id))
    .limit(1);
  if (!seller) {
    throw new HTTPException(404, { message: "Seller profile not found" });
  }
  return seller;
}

shipmentsRoutes.get("/", async (c) => {
  const seller = await getSellerFromSession(c.req.raw.headers);
  const result = await getAllShipments(seller.id);
  return c.json(result);
});

shipmentsRoutes.get("/status/:status", async (c) => {
  const seller = await getSellerFromSession(c.req.raw.headers);
  const statusParam = c.req.param("status");

  if (!(shipmentStatusEnum.enumValues as string[]).includes(statusParam)) {
    throw new HTTPException(422, {
      message: `Invalid status. Must be one of: ${shipmentStatusEnum.enumValues.join(", ")}`,
    });
  }

  const result = await getShipmentsByStatus(
    statusParam as ShipmentStatus,
    seller.id,
  );
  return c.json(result);
});

shipmentsRoutes.get("/:id", async (c) => {
  const seller = await getSellerFromSession(c.req.raw.headers);
  const shipment = await getShipmentById(c.req.param("id"), seller.id);
  if (!shipment) {
    throw new HTTPException(404, { message: "Shipment not found" });
  }
  return c.json(shipment);
});

shipmentsRoutes.post("/", async (c) => {
  const seller = await getSellerFromSession(c.req.raw.headers);
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
  const seller = await getSellerFromSession(c.req.raw.headers);
  const body = updateShipmentSchema.parse(await c.req.json());

  const shipment = await updateShipment(c.req.param("id"), body, seller.id);
  if (!shipment) {
    throw new HTTPException(404, { message: "Shipment not found" });
  }
  return c.json(shipment);
});

shipmentsRoutes.delete("/:id", async (c) => {
  const seller = await getSellerFromSession(c.req.raw.headers);
  const shipment = await deleteShipment(c.req.param("id"), seller.id);
  if (!shipment) {
    throw new HTTPException(404, { message: "Shipment not found" });
  }
  return c.json(shipment);
});
