import { organization } from "better-auth/plugins";
import { APIError } from "better-auth/api";
import { eq } from "drizzle-orm";
import { db } from "@/core/db";
import { user } from "@/db/schema";

export const organizationPlugin = organization({
  schema: {
    organization: {
      additionalFields: {
        color: {
          type: "string",
          defaultValue: "#f59e0b",
        },
      },
    },
  },
  organizationLimit: 1,
  allowUserToCreateOrganization: async (creator) => {
    return creator.userType === "seller" && !creator.organizationId;
  },
  organizationHooks: {
    afterCreateOrganization: async ({ member: newMember }) => {
      await db
        .update(user)
        .set({ organizationId: newMember.organizationId })
        .where(eq(user.id, newMember.userId));
    },
    beforeAcceptInvitation: async ({ invitation }) => {
      const [invitee] = await db
        .select({ organizationId: user.organizationId })
        .from(user)
        .where(eq(user.email, invitation.email))
        .limit(1);

      if (invitee?.organizationId) {
        throw new APIError("BAD_REQUEST", {
          message: "You are already a member of an organization",
        });
      }
    },
    afterAcceptInvitation: async ({ member: newMember }) => {
      await db
        .update(user)
        .set({ organizationId: newMember.organizationId })
        .where(eq(user.id, newMember.userId));
    },
  },
});
