import { mock } from "bun:test";
import type {
  DriverLocationUpdate,
  TrackingHandler,
  TrackingMessage,
} from "@/lib/tracking/messages";

// Spy stand-ins for `@/lib/tracking`, wired in `test/setup.ts` — see code-standards.md → Tests.
export const trackingMocks = {
  publishTracking: mock(async (_message: TrackingMessage) => undefined),
  getLastKnownLocation: mock(
    async (_driverId: string): Promise<DriverLocationUpdate | null> => null,
  ),
  subscribeToDriver: mock(
    async (_driverId: string, _handler: TrackingHandler) => undefined,
  ),
  unsubscribeFromDriver: mock(
    async (_driverId: string, _handler: TrackingHandler) => undefined,
  ),
};

export function resetTrackingMocks() {
  for (const mockFn of Object.values(trackingMocks)) mockFn.mockClear();
  trackingMocks.getLastKnownLocation.mockImplementation(async () => null);
}
