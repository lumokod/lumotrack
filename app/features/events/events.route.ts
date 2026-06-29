import { Hono } from "hono";
import { sValidator } from "@hono/standard-validator";
import {
  sessionMiddleware,
  requireActiveOrg,
  requirePermission,
  type AppEnv,
} from "@/shared/middleware/auth.middleware";
import { idParamSchema } from "@/shared/validations/common";
import { createEventSchema } from "./events.validation";
import { createEvent, getShipmentEvents } from "./events.service";

export const eventsRoutes = new Hono<AppEnv>();

eventsRoutes.use(sessionMiddleware);
eventsRoutes.use(requireActiveOrg);

eventsRoutes.post(
  "/:id/events",
  requirePermission({ event: ["create"] }),
  sValidator("param", idParamSchema),
  sValidator("json", createEventSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");
    const user = c.get("user");
    const event = await createEvent(id, user.id, body);
    return c.json(event, 201);
  },
);

eventsRoutes.get(
  "/:id/events",
  requirePermission({ event: ["read"] }),
  sValidator("param", idParamSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const organizationId = c.get("session").activeOrganizationId!;
    const result = await getShipmentEvents(id, organizationId);
    return c.json(result);
  },
);
