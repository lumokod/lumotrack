import { organization } from "better-auth/plugins";
import { createAccessControl } from "better-auth/plugins/access";
import {
  defaultStatements,
  ownerAc,
} from "better-auth/plugins/organization/access";
import { organizationHooks } from "../hooks/organization.hooks";

const statements = {
  ...defaultStatements,
  organization: [...defaultStatements.organization, "read"],
  shipment: ["create", "read", "update"],
  event: ["create", "read", "update"],
  location: ["create", "delete"],
  tag: ["create", "read", "update", "delete"],
  product: ["create", "read", "update", "delete"],
  order: ["create", "read", "update", "delete"],
} as const;

const ac = createAccessControl(statements);

const owner = ac.newRole({
  shipment: ["create", "read", "update"],
  event: ["create", "read", "update"],
  tag: ["create", "read", "update", "delete"],
  product: ["create", "read", "update", "delete"],
  order: ["create", "read", "update", "delete"],
  ...ownerAc.statements,
  organization: ["update", "delete", "read"],
});

const seller = ac.newRole({
  shipment: ["create", "read", "update"],
  event: ["read"],
  tag: ["create", "read", "update", "delete"],
  product: ["create", "read", "update", "delete"],
  order: ["create", "read", "update", "delete"],
  organization: ["read"],
});

const driver = ac.newRole({
  shipment: ["read", "update"],
  event: ["create"],
  location: ["create", "delete"],
  tag: ["read"],
  product: ["read"],
  order: ["read"],
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
        verificationStatus: {
          type: "string",
          required: false,
          defaultValue: "pending",
        },
      },
    },
  },
  organizationLimit: 1,

  organizationHooks,
});
