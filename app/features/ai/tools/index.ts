import { getShipmentTools } from "./shipments.tools";
import { getEventTools } from "./events.tools";

export function getTools(orgId: string) {
  return {
    ...getShipmentTools(orgId),
    ...getEventTools(orgId),
  };
}
