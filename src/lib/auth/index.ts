import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import * as schema from "@/db/schema";
import { admin, openAPI } from "better-auth/plugins";
import { db } from "@/core/db";
import { env } from "@/core/env";
import { organizationPlugin } from "./plugins/organization.plugin";
import { sendVerificationEmail } from "../mail";
import { databaseHooks } from "./hooks/database.hooks";

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      await sendVerificationEmail(user.email, url);
    },
    autoSignInAfterVerification: true,
  },
  session: {
    // Serve session+user from a signed cookie to skip the per-request DB
    // lookup. Snapshot is at most `maxAge` stale (role/ban/revocation lag).
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
  databaseHooks,

  plugins: [organizationPlugin, admin(), openAPI()],
});
