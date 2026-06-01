import { organization } from "better-auth/plugins";
import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements } from "better-auth/plugins/organization/access";
import { APIError } from "better-auth/api";
import { eq } from "drizzle-orm";
import { db } from "@/core/db";
import { user } from "@/db/schema";

export const ac = createAccessControl(defaultStatements);

const owner = ac.newRole({
  organization: ["update", "delete"],
  member: ["create", "update", "delete"],
  invitation: ["create", "cancel"],
});

const seller = ac.newRole({
  invitation: ["create", "cancel"],
});

const driver = ac.newRole({});

export const roles = { owner, seller, driver };

export const organizationPlugin = organization({
  organizationLimit: 1,
  ac,
  roles,
  organizationHooks: {
    beforeCreateOrganization: async ({ user: creator }) => {
      const [existing] = await db
        .select({ organizationId: user.organizationId })
        .from(user)
        .where(eq(user.id, creator.id))
        .limit(1);

      if (existing?.organizationId) {
        throw new APIError("BAD_REQUEST", {
          message: "You are already a member of an organization",
        });
      }
    },
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
