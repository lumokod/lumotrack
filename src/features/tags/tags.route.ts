import { Hono } from "hono";
import { sValidator } from "@hono/standard-validator";
import {
  sessionMiddleware,
  requireActiveOrg,
  requirePermission,
  type AppEnv,
} from "@/shared/middleware/auth.middleware";
import { getOrgTags, createTag, updateTag, deleteTag } from "./tags.service";
import { createTagSchema, updateTagSchema } from "./tags.validation";
import { idParamSchema } from "@/shared/validations/common";

export const tagsRoutes = new Hono<AppEnv>();

tagsRoutes.use(sessionMiddleware);
tagsRoutes.use(requireActiveOrg);

tagsRoutes.get("/", requirePermission({ tag: ["read"] }), async (c) => {
  const organizationId = c.get("session").activeOrganizationId!;
  const result = await getOrgTags(organizationId);
  return c.json(result);
});

tagsRoutes.post(
  "/",
  requirePermission({ tag: ["create"] }),
  sValidator("json", createTagSchema),
  async (c) => {
    const data = c.req.valid("json");
    const organizationId = c.get("session").activeOrganizationId!;
    const tag = await createTag(data, organizationId);
    return c.json(tag, 201);
  },
);

tagsRoutes.patch(
  "/:id",
  requirePermission({ tag: ["update"] }),
  sValidator("param", idParamSchema),
  sValidator("json", updateTagSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const data = c.req.valid("json");
    const organizationId = c.get("session").activeOrganizationId!;
    const tag = await updateTag(id, data, organizationId);
    return c.json(tag);
  },
);

tagsRoutes.delete(
  "/:id",
  requirePermission({ tag: ["delete"] }),
  sValidator("param", idParamSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const organizationId = c.get("session").activeOrganizationId!;
    await deleteTag(id, organizationId);
    return c.body(null, 204);
  },
);
