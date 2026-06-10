import { Hono } from "hono";
import { auth } from "@/lib/auth";
import { sessionMiddleware, requirePermission } from "@/shared/middleware/auth.middleware";

export const authRoutes = new Hono();

authRoutes.get(
  "/organization/get-full-organization",
  sessionMiddleware,
  requirePermission({ organization: ["read"] }),
  (c) => auth.handler(c.req.raw),
);

authRoutes.on(["GET", "POST"], "/*", (c) => auth.handler(c.req.raw));
