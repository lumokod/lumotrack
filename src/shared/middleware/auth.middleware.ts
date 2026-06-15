import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/core/db";
import { organization } from "@/db/schema";

export type AppEnv = {
  Variables: {
    user: typeof auth.$Infer.Session.user;
    session: typeof auth.$Infer.Session.session;
  };
};

export const sessionMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const result = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!result) throw new HTTPException(401, { message: "Unauthorized" });
  c.set("user", result.user);
  c.set("session", result.session);
  await next();
});

export const requireActiveOrg = createMiddleware<AppEnv>(async (c, next) => {
  if (!c.get("session").activeOrganizationId) {
    throw new HTTPException(403, { message: "No active organization" });
  }
  await next();
});

export const requirePermission = (permissions: Record<string, string[] | undefined>) =>
  createMiddleware<AppEnv>(async (c, next) => {
    const result = await auth.api.hasPermission({
      headers: c.req.raw.headers,
      body: { permissions },
    });
    if (!result.success) throw new HTTPException(403, { message: "Forbidden" });
    await next();
  });

export const requireVerifiedOrg = createMiddleware<AppEnv>(async (c, next) => {
  const orgId = c.get("session").activeOrganizationId;
  if (!orgId) throw new HTTPException(403, { message: "No active organization" });

  const [org] = await db
    .select({ verificationStatus: organization.verificationStatus })
    .from(organization)
    .where(eq(organization.id, orgId))
    .limit(1);

  if (org?.verificationStatus !== "verified") {
    throw new HTTPException(403, {
      message: "Organization must be verified to perform this action",
    });
  }
  await next();
});

export const requireAdmin = createMiddleware<AppEnv>(async (c, next) => {
  if (c.get("user").role !== "admin") {
    throw new HTTPException(403, { message: "Admin access required" });
  }
  await next();
});
