import { organization } from "better-auth/plugins";

export const organizationPlugin = organization({
  organizationLimit: 1,
});
