import { Hono } from "hono";
import { sValidator } from "@hono/standard-validator";
import {
  sessionMiddleware,
  requireRole,
  type AppEnv,
} from "@/shared/middleware/auth.middleware";

import { idParamSchema } from "@/shared/validators/common";
import { getDriver } from "@/features/drivers/drivers.service";
import { getSeller } from "@/features/sellers/sellers.service";
import { createEventSchema } from "./events.validation";
import { createEvent, getShipmentEvents } from "./events.service";

export const eventsRoutes = new Hono<AppEnv>();

eventsRoutes.use(sessionMiddleware);

eventsRoutes.post(
  "/:id/events",
  requireRole("driver"),
  sValidator("param", idParamSchema),
  sValidator("json", createEventSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");
    const user = c.get("user");
    const driver = await getDriver(user.id);
    const event = await createEvent(id, driver.id, body);
    return c.json(event, 201);
  },
);

eventsRoutes.get(
  "/:id/events",
  requireRole("seller"),
  sValidator("param", idParamSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const user = c.get("user");
    const seller = await getSeller(user.id);
    const result = await getShipmentEvents(id, seller.id);
    return c.json(result);
  },
);
