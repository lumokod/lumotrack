import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import * as schema from "@/db/schema";
import { admin, openAPI } from "better-auth/plugins";
import { db } from "@/core/db";
import { env } from "@/core/env";
import { eq } from "drizzle-orm";
import { user, member } from "@/db/schema";
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
  user: {
    additionalFields: {
      organizationId: {
        type: "string",
        required: false,
        input: false,
      },
      userType: {
        type: "string",
        required: false,
        input: false,
      },
    },
  },

  plugins: [organizationPlugin, admin(), openAPI()],
});
