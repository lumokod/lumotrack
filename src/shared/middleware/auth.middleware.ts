import { and, eq } from "drizzle-orm";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { auth } from "@/lib/auth";
import { db } from "@/core/db";
import { member } from "@/db/schema";
import type { OrgRole } from "@/features/auth/auth.types";

type GetSessionResult = NonNullable<
  Awaited<ReturnType<typeof auth.api.getSession>>
>;

export type AppEnv = {
  Variables: {
    user: GetSessionResult["user"];
    session: GetSessionResult["session"];
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
    const session = c.get("session");

    if (!session.activeOrganizationId) {
      throw new HTTPException(403, { message: "No active organization" });
    }

    const [membership] = await db
      .select()
      .from(member)
      .where(
        and(
          eq(member.userId, user.id),
          eq(member.organizationId, session.activeOrganizationId),
        ),
      )
      .limit(1);

    if (!membership || !roles.includes(membership.role as OrgRole)) {
      throw new HTTPException(403, { message: "Forbidden" });
    }

    await next();
  });
