import { db } from "@/core/db";
import { driverProfiles } from "@/db/schema";

export const organizationHooks = {
  afterAddMember: async ({ member: newMember }: { member: { role: string; userId: string; organizationId: string } }) => {
    if (newMember.role === "driver") {
      await db
        .insert(driverProfiles)
        .values({
          userId: newMember.userId,
          organizationId: newMember.organizationId,
        })
        .onConflictDoNothing();
    }
  },
  beforeCreateInvitation: async ({ invitation }: { invitation: Record<string, unknown> & { role?: string } }) => ({
    data: { ...invitation, role: invitation.role || "driver" },
  }),
  beforeCreateOrganization: async ({ organization: org }: { organization: Record<string, unknown> & { slug?: string } }) => ({
    data: { ...org, slug: org.slug?.toLowerCase() },
  }),
};
