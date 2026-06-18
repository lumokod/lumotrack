import type { OrganizationOptions } from "better-auth/plugins/organization";
import { APIError } from "better-auth/api";
import { eq } from "drizzle-orm";
import { db } from "@/core/db";
import { driverProfiles, member } from "@/db/schema";
import { seedDefaultTags } from "@/features/tags/tags.service";

type OrgHooks = NonNullable<OrganizationOptions["organizationHooks"]>;

export const organizationHooks: OrgHooks = {
  // A user may belong to only one organization. Org creation is already
  // capped at 1 per user (organizationLimit); this blocks the other path
  // into a second org — accepting an invitation while already a member.
  beforeAddMember: async ({ member: newMember }) => {
    const existing = await db.query.member.findFirst({
      where: eq(member.userId, newMember.userId),
    });
    if (existing) {
      throw new APIError("BAD_REQUEST", {
        message: "User already belongs to an organization",
      });
    }
  },
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
  afterCreateOrganization: async ({ organization: org }) => {
    // Give every new org a starter tag catalog they can edit freely.
    await seedDefaultTags(org.id);
  },
};
