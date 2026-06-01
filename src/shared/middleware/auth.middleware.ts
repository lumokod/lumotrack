import { eq } from "drizzle-orm";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { auth } from "@/lib/auth";
import { db } from "@/core/db";
import { member } from "@/db/schema";
import type { OrgRole } from "@/features/auth/auth.types";

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

export const requireOrgRole = (...roles: OrgRole[]) =>
  createMiddleware<AppEnv>(async (c, next) => {
    const user = c.get("user");

    const [membership] = await db
      .select({ organizationId: member.organizationId, role: member.role })
      .from(member)
      .where(eq(member.userId, user.id))
      .limit(1);

    if (!membership) {
      throw new HTTPException(403, { message: "No active organization" });
    }

    if (!roles.includes(membership.role as OrgRole)) {
      throw new HTTPException(403, { message: "Forbidden" });
    }

    await next();
  });
