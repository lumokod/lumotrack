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
} as const;

const ac = createAccessControl(statements);

const owner = ac.newRole({
  shipment: ["create", "read", "update"],
  event: ["create", "read", "update"],
  ...ownerAc.statements,
  organization: ["update", "delete", "read"],
});

const seller = ac.newRole({
  shipment: ["create", "read", "update"],
  event: ["read"],
  organization: ["read"],
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

  organizationHooks,
});
