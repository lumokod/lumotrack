import { z } from "zod";
import type { WSMessageReceive } from "hono/ws";

export const trackingPingSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

/** Parse a raw WS message into a tracking ping, or null if malformed. */
export function parseTrackingPing(data: WSMessageReceive) {
  if (typeof data !== "string") return null;
  try {
    const result = trackingPingSchema.safeParse(JSON.parse(data));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}
