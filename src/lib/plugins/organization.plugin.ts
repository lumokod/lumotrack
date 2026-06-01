import { organization } from "better-auth/plugins";
import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements } from "better-auth/plugins/organization/access";
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
    afterCreateOrganization: async ({ member: newMember }) => {
      await db
        .update(user)
        .set({ organizationId: newMember.organizationId })
        .where(eq(user.id, newMember.userId));
    },
    afterAcceptInvitation: async ({ member: newMember }) => {
      await db
        .update(user)
        .set({ organizationId: newMember.organizationId })
        .where(eq(user.id, newMember.userId));
    },
  },
});
