import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import * as schema from "@/db/schema";
import { organization, admin, openAPI } from "better-auth/plugins";
import { db } from "@/db";
import { env } from "@/core/env";
import { userFields } from "@/features/auth/auth.validation";

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: userFields,
  },
  plugins: [organization(), admin(), openAPI()],
});
