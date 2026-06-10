import type { BetterAuthOptions } from "better-auth";
import { db } from "@/core/db";
import { member } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

type DatabaseHooks = NonNullable<BetterAuthOptions["databaseHooks"]>;

const sessionHooks: DatabaseHooks["session"] = {
  create: {
    before: async (session) => {
      const membership = await db.query.member.findFirst({
        where: eq(member.userId, session.userId),
        orderBy: asc(member.createdAt),
      });
      return {
        data: {
          ...session,
          activeOrganizationId: membership?.organizationId ?? null,
        },
      };
    },
  },
};

export const databaseHooks: DatabaseHooks = {
  session: sessionHooks,
};
