import { mock } from "bun:test";
import type {
  DriverLocationUpdate,
  TrackingHandler,
  TrackingMessage,
} from "@/lib/tracking/messages";

// Spy mocks wired into `mock.module("@/lib/tracking", ...)` in `test/setup.ts`
// (the real module opens Redis connections at import time). Tests import these
// to assert on publishes/subscriptions or stub a last-known position.
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
