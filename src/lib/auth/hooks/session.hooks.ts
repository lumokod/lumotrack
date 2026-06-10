import { db } from "@/core/db";
import { member } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

export const sessionHooks = {
  session: {
    create: {
      before: async (session: { userId: string; [key: string]: unknown }) => {
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
  },
};
