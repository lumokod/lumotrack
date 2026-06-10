import type { OrganizationOptions } from "better-auth/plugins/organization";
import { db } from "@/core/db";
import { driverProfiles } from "@/db/schema";

type OrgHooks = NonNullable<OrganizationOptions["organizationHooks"]>;

export const organizationHooks: OrgHooks = {
  afterAddMember: async ({ member: newMember }) => {
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
  beforeCreateInvitation: async ({ invitation }) => ({
    data: { ...invitation, role: invitation.role || "driver" },
  }),
  beforeCreateOrganization: async ({ organization: org }) => ({
    data: { ...org, slug: org.slug?.toLowerCase() },
  }),
};
