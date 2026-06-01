import { organization } from "better-auth/plugins";
import { eq } from "drizzle-orm";
import { db } from "@/core/db";
import { user } from "@/db/schema";

export const organizationPlugin = organization({
  organizationLimit: 1,
  organizationHooks: {
    afterAddMember: async ({ member: newMember }) => {
      await db
        .update(user)
        .set({ organizationId: newMember.organizationId })
        .where(eq(user.id, newMember.userId));
    },
  },
});
