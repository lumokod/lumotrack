import { organization } from "better-auth/plugins";
import { createAccessControl } from "better-auth/plugins/access";
import {
  defaultStatements,
  ownerAc,
} from "better-auth/plugins/organization/access";

const statements = {
  ...defaultStatements,
  shipment: ["create", "read", "update", "delete"],
  event: ["create", "read", "update", "delete"],
  location: ["create", "delete"],
} as const;

const ac = createAccessControl(statements);

const owner = ac.newRole({
  shipment: ["create", "read", "update", "delete"],
  event: ["create", "read", "update", "delete"],
  ...ownerAc.statements,
});

const seller = ac.newRole({
  shipment: ["create", "read", "update", "delete"],
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
    beforeAddMember: async ({ member: m }) => ({
      data: { ...m, role: m.role || "driver" },
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
