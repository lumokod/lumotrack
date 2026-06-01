import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import * as schema from "@/db/schema";
import { organization, admin, openAPI } from "better-auth/plugins";
import { db } from "@/core/db";
import { eq } from "drizzle-orm";
import { env } from "@/core/env";
import { sellers } from "@/db/schema";

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
  plugins: [
    organization({
      organizationLimit: 1,
      hooks: {
        organization: {
          afterCreate: async ({ organization: org, member }: { organization: { id: string }, member: { userId: string } }) => {
            await db
              .update(sellers)
              .set({ orgId: org.id })
              .where(eq(sellers.userId, member.userId));
          },
        },
      },
    }),
    admin(),
    openAPI(),
  ],
});
