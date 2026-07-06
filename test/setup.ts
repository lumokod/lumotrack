import { mock } from "bun:test";
import { authState } from "./helpers/auth";

// --- Auth boundary -----------------------------------------------------------
// Tests inject sessions via helpers/auth — see code-standards.md → Tests → Mocked boundaries.
mock.module("@/lib/auth", () => ({
  auth: {
    handler: async () =>
      new Response("auth handler not mocked", { status: 501 }),
    api: {
      getSession: async () => authState.session,
      hasPermission: async () => ({ success: authState.hasPermission }),
    },
  },
}));

// --- Live tracking / Redis ---------------------------------------------------
// Opens Redis connections at import time (like the queue); spies live in helpers/tracking.
import { trackingMocks } from "./helpers/tracking";

mock.module("@/lib/tracking", () => trackingMocks);

// --- Queue / Redis -----------------------------------------------------------
// BullMQ opens a Redis connection at import time — stub the surface the app uses.
mock.module("@/lib/queue", () => ({
  addNotification: async () => undefined,
  notificationQueue: { add: async () => undefined },
  startNotificationWorker: () => undefined,
}));
