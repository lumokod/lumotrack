import { describe, test, expect, beforeEach } from "bun:test";
import { uuidv7 } from "uuidv7";
import app from "@/core/app";
import { loginAs, logout, denyPermission } from "../../../test/helpers/auth";
import { resetDb, seedOrg, seedDriver, seedShipment } from "../../../test/helpers/db";
import { trackingMocks, resetTrackingMocks } from "../../../test/helpers/tracking";
import { requestUpgrade, fakeSocket } from "../../../test/helpers/ws";

const ORG_ID = "org_test_1";
const DRIVER_ID = "driver_test_1";

// The driver is the actor — these are the self-service `/me` endpoints.
beforeEach(async () => {
  await resetDb();
  await seedOrg({ id: ORG_ID });
  await seedDriver({ userId: DRIVER_ID, orgId: ORG_ID, isAvailable: true });
  loginAs({ userId: DRIVER_ID, orgId: ORG_ID, role: "driver" });
});

describe("PATCH /api/drivers/me/availability", () => {
  function setAvailability(isAvailable: boolean) {
    return app.request("/api/drivers/me/availability", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isAvailable }),
    });
  }

  test("toggles the driver's availability (200)", async () => {
    const res = await setAvailability(false);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ isAvailable: false });
  });

  test("404 when the user has no driver profile", async () => {
    loginAs({ userId: "no_profile_user", orgId: ORG_ID });
    expect((await setAvailability(true)).status).toBe(404);
  });
});

describe("GET /api/drivers/me/shipments", () => {
  test("returns only shipments assigned to this driver", async () => {
    await seedShipment({ orgId: ORG_ID, driverUserId: DRIVER_ID });
    await seedShipment({ orgId: ORG_ID, driverUserId: DRIVER_ID });
    await seedShipment({ orgId: ORG_ID }); // unassigned — must not appear

    const res = await app.request("/api/drivers/me/shipments");
    expect(res.status).toBe(200);
    expect((await res.json()).data).toHaveLength(2);
  });
});

describe("GET /api/drivers/me/shipments/:id", () => {
  test("200 for a shipment assigned to this driver", async () => {
    const shipment = await seedShipment({ orgId: ORG_ID, driverUserId: DRIVER_ID });
    const res = await app.request(`/api/drivers/me/shipments/${shipment.id}`);
    expect(res.status).toBe(200);
  });

  test("404 for a shipment not assigned to this driver", async () => {
    const shipment = await seedShipment({ orgId: ORG_ID }); // unassigned
    const res = await app.request(`/api/drivers/me/shipments/${shipment.id}`);
    expect(res.status).toBe(404);
  });
});

describe("driver locations", () => {
  test("201 creates a location", async () => {
    const res = await app.request("/api/drivers/me/locations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ longitude: 35.5, latitude: 33.9, label: "Home base" }),
    });
    expect(res.status).toBe(201);
  });

  test("404 deleting a location that does not exist", async () => {
    const res = await app.request(`/api/drivers/me/locations/${uuidv7()}`, {
      method: "DELETE",
    });
    expect(res.status).toBe(404);
  });
});

describe("GET /api/drivers/me/tracking (WS)", () => {
  beforeEach(() => {
    resetTrackingMocks();
  });

  function ping(overrides: Record<string, unknown> = {}) {
    return new MessageEvent("message", {
      data: JSON.stringify({ latitude: 33.9, longitude: 35.5, ...overrides }),
    });
  }

  test("401 when unauthenticated", async () => {
    logout();
    const { response } = await requestUpgrade("/api/drivers/me/tracking");
    expect(response.status).toBe(401);
  });

  test("403 when permission denied", async () => {
    denyPermission();
    const { response } = await requestUpgrade("/api/drivers/me/tracking");
    expect(response.status).toBe(403);
  });

  test("upgrades and publishes a valid ping on the driver's channel", async () => {
    const { response, events } = await requestUpgrade("/api/drivers/me/tracking");
    expect(response.status).toBe(200);

    const { socket } = fakeSocket();
    events!.onMessage!(ping(), socket);

    expect(trackingMocks.publishTracking).toHaveBeenCalledTimes(1);
    expect(trackingMocks.publishTracking.mock.calls[0][0]).toMatchObject({
      type: "location",
      driverId: DRIVER_ID,
      latitude: 33.9,
      longitude: 35.5,
    });
  });

  test("rejects a malformed ping without publishing", async () => {
    const { events } = await requestUpgrade("/api/drivers/me/tracking");
    const { sent, socket } = fakeSocket();

    events!.onMessage!(ping({ latitude: 999 }), socket);

    expect(trackingMocks.publishTracking).not.toHaveBeenCalled();
    expect(JSON.parse(sent[0])).toMatchObject({ type: "error" });
  });

  test("drops pings arriving faster than the rate guard", async () => {
    const { events } = await requestUpgrade("/api/drivers/me/tracking");
    const { socket } = fakeSocket();

    events!.onMessage!(ping(), socket);
    events!.onMessage!(ping(), socket); // immediate second ping — dropped

    expect(trackingMocks.publishTracking).toHaveBeenCalledTimes(1);
  });

  test("publishes an offline message when the socket closes", async () => {
    const { events } = await requestUpgrade("/api/drivers/me/tracking");
    const { socket } = fakeSocket();

    events!.onClose!(new CloseEvent("close"), socket);

    expect(trackingMocks.publishTracking).toHaveBeenCalledTimes(1);
    expect(trackingMocks.publishTracking.mock.calls[0][0]).toMatchObject({
      type: "offline",
      driverId: DRIVER_ID,
    });
  });
});
