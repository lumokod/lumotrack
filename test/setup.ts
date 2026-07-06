import { mock } from "bun:test";
import { authState } from "./helpers/auth";

// --- Auth boundary -----------------------------------------------------------
// Replace the whole Better Auth instance so endpoint tests control the session
// without signing up / verifying email. Only the surface the app touches at
// runtime is implemented (`api.getSession`, `api.hasPermission`, `handler`).
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
// `@/lib/tracking/client` opens two Redis connections at import time. Routes
// import the pub/sub surface, so stub it; the spies live in helpers/tracking
// so tests can assert on publishes and captured subscription handlers.
import { trackingMocks } from "./helpers/tracking";

mock.module("@/lib/tracking", () => trackingMocks);

// --- Queue / Redis -----------------------------------------------------------
// `@/lib/queue/client` calls `new Queue(...)` at import time, which opens a
// Redis connection. events.service imports it, so importing the app would hang
// without Redis. Stub the surface the app imports.
mock.module("@/lib/queue", () => ({
  addNotification: async () => undefined,
  notificationQueue: { add: async () => undefined },
  startNotificationWorker: () => undefined,
}));
