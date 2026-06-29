import { Hono } from "hono";
import { sValidator } from "@hono/standard-validator";
import {
  sessionMiddleware,
  requireActiveOrg,
  requirePermission,
  type AppEnv,
} from "@/shared/middleware/auth.middleware";
import { getOrgAddresses, createAddress, deleteAddress } from "./addresses.service";
import { createAddressSchema } from "./addresses.validation";
import { idParamSchema } from "@/shared/validations/common";

export const addressesRoutes = new Hono<AppEnv>();

addressesRoutes.use(sessionMiddleware);
addressesRoutes.use(requireActiveOrg);

addressesRoutes.get(
  "/",
  requirePermission({ shipment: ["read"] }),
  async (c) => {
    const session = c.get("session");
    const result = await getOrgAddresses(session.activeOrganizationId!);
    return c.json(result);
  },
);

addressesRoutes.post(
  "/",
  requirePermission({ shipment: ["create"] }),
  sValidator("json", createAddressSchema),
  async (c) => {
    const session = c.get("session");
    const data = c.req.valid("json");
    const address = await createAddress(data, session.activeOrganizationId!);
    return c.json(address, 201);
  },
);

addressesRoutes.delete(
  "/:id",
  requirePermission({ shipment: ["create"] }),
  sValidator("param", idParamSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const session = c.get("session");
    await deleteAddress(id, session.activeOrganizationId!);
    return c.body(null, 204);
  },
);
