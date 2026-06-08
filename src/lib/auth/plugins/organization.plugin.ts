import { organization } from "better-auth/plugins";
import { createAccessControl } from "better-auth/plugins/access";
import {
  defaultStatements,
  ownerAc,
} from "better-auth/plugins/organization/access";
import { db } from "@/core/db";
import { driverProfiles } from "@/db/schema";

const statements = {
  ...defaultStatements,
  shipment: ["create", "read", "update"],
  event: ["create", "read", "update"],
  location: ["create", "delete"],
} as const;

const ac = createAccessControl(statements);

const owner = ac.newRole({
  shipment: ["create", "read", "update"],
  event: ["create", "read", "update"],
  ...ownerAc.statements,
});

const seller = ac.newRole({
  shipment: ["create", "read", "update"],
  event: ["read"],
});

const driver = ac.newRole({
  shipment: ["read", "update"],
  event: ["create"],
  location: ["create", "delete"],
});

export const roles = {
  owner,
  seller,
  driver,
};

export const organizationPlugin = organization({
  ac,
  roles,
  schema: {
    organization: {
      additionalFields: {
        color: {
          type: "string",
          required: false,
          defaultValue: "#f59e0b",
        },
      },
    },
  },
  organizationLimit: 1,

  organizationHooks: {
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
    beforeCreateOrganization: async ({ organization: org }) => {
      return {
        data: {
          ...org,
          slug: org.slug?.toLowerCase(),
        },
      };
    },
  },
});
