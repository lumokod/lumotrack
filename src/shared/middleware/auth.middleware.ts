import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { auth } from "@/lib/auth";
import { type UserRole } from "@/features/auth/auth.types";

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

export const requireRole = (...roles: UserRole[]) =>
  createMiddleware<AppEnv>(async (c, next) => {
    const user = c.get("user");
    if (!roles.includes(user.role as UserRole)) {
      throw new HTTPException(403, { message: "Forbidden" });
    }
    await next();
  });
