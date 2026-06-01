import { organization } from "better-auth/plugins";
import { createAccessControl } from "better-auth/plugins/access";

const ac = createAccessControl({
  shipment: ["create", "read", "update", "delete", "assign"],
} as const);

export const organizationPlugin = organization({
  ac,
  roles: {
    owner: ac.newRole({
      shipment: ["create", "read", "update", "delete", "assign"],
    }),
    seller: ac.newRole({
      shipment: ["create", "read", "update", "delete", "assign"],
    }),
    driver: ac.newRole({ shipment: ["read", "update"] }),
  },
  organizationLimit: 1,
});
