import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { auth } from "@/lib/auth";
import type { UserType } from "@/features/auth/auth.types";

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

export const requireUserType = (...types: UserType[]) =>
  createMiddleware<AppEnv>(async (c, next) => {
    const user = c.get("user");
    if (!types.includes(user.userType as UserType)) {
      throw new HTTPException(403, { message: "Forbidden" });
    }
    await next();
  });
