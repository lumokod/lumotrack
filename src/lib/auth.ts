import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import * as schema from "@/db/schema";
import { admin, openAPI } from "better-auth/plugins";
import { db } from "@/core/db";
import { env } from "@/core/env";
import { organizationPlugin } from "./plugins/organization.plugin";

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

  plugins: [organizationPlugin, admin(), openAPI()],
});
