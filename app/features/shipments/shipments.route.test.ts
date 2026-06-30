import { describe, test, expect, beforeEach } from "bun:test";
import app from "@/core/app";
import { loginAs, logout, denyPermission } from "../../../test/helpers/auth";
import {
  resetDb,
  seedOrg,
  seedUserMember,
  seedDriver,
  seedAddress,
  seedShipment,
} from "../../../test/helpers/db";

const ORG_ID = "org_test_1";
const USER_ID = "user_test_1";

// Fresh DB + a verified org with an owner, logged in, before each test.
beforeEach(async () => {
  await resetDb();
  await seedOrg({ id: ORG_ID, verificationStatus: "verified" });
  await seedUserMember({ userId: USER_ID, orgId: ORG_ID, role: "owner" });
  loginAs({ userId: USER_ID, orgId: ORG_ID });
});

describe("GET /api/shipments", () => {
  test("401 when unauthenticated", async () => {
    logout();
    const res = await app.request("/api/shipments");
    expect(res.status).toBe(401);
  });

  test("403 when permission denied", async () => {
    denyPermission();
    const res = await app.request("/api/shipments");
    expect(res.status).toBe(403);
  });

  test("403 when no active organization", async () => {
    loginAs({ userId: USER_ID, orgId: null });
    const res = await app.request("/api/shipments");
    expect(res.status).toBe(403);
  });

  test("returns an empty page initially", async () => {
    const res = await app.request("/api/shipments");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ data: [], nextCursor: null });
  });
});

describe("POST /api/shipments", () => {
  function createBody(overrides: Record<string, unknown> = {}) {
    return {
      content: "Books",
      weight: 3.2,
      destination: { longitude: 35.5, latitude: 33.9 },
      ...overrides,
    };
  }

  async function post(body: unknown) {
    return app.request("/api/shipments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  test("creates a shipment (201) and echoes destination back", async () => {
    const res = await post(createBody());
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toMatchObject({
      content: "Books",
      weight: 3.2,
      status: "created",
      organizationId: ORG_ID,
      destination: { longitude: 35.5, latitude: 33.9 },
    });
    expect(body.id).toBeString();

    // Round-trip: it now shows up in the list.
    const list = await (await app.request("/api/shipments")).json();
    expect(list.data).toHaveLength(1);
  });

  test("400 on invalid body (weight over limit)", async () => {
    const res = await post(createBody({ weight: 99 }));
    expect(res.status).toBe(400);
  });

  test("400 on missing required field (content)", async () => {
    const { content, ...rest } = createBody();
    const res = await post(rest);
    expect(res.status).toBe(400);
  });

  test("403 when org is not verified", async () => {
    await resetDb();
    await seedOrg({ id: ORG_ID, verificationStatus: "pending" });
    await seedUserMember({ userId: USER_ID, orgId: ORG_ID, role: "owner" });
    loginAs({ userId: USER_ID, orgId: ORG_ID });

    const res = await post(createBody());
    expect(res.status).toBe(403);
  });
});

describe("PATCH /api/shipments/:id/assign", () => {
  const DRIVER_ID = "driver_test_1";

  function assign(shipmentId: string, driverId: string) {
    return app.request(`/api/shipments/${shipmentId}/assign`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ driverId }),
    });
  }

  // A shipment that satisfies the pre-assignment requirements (pickup address
  // + a client contact), so each negative test can drop exactly one.
  async function readyShipment(overrides = {}) {
    const originAddressId = await seedAddress({ orgId: ORG_ID });
    return seedShipment({
      orgId: ORG_ID,
      originAddressId,
      clientContactEmail: "client@example.com",
      ...overrides,
    });
  }

  test("assigns an available driver (200) and sets status to assigned", async () => {
    const shipment = await readyShipment();
    await seedDriver({ userId: DRIVER_ID, orgId: ORG_ID, isAvailable: true });

    const res = await assign(shipment.id, DRIVER_ID);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      status: "assigned",
      driverUserId: DRIVER_ID,
    });
  });

  test("400 when the shipment has no pickup address", async () => {
    const shipment = await seedShipment({
      orgId: ORG_ID,
      clientContactEmail: "client@example.com",
    });
    await seedDriver({ userId: DRIVER_ID, orgId: ORG_ID });
    expect((await assign(shipment.id, DRIVER_ID)).status).toBe(400);
  });

  test("400 when the shipment has no client contact", async () => {
    const originAddressId = await seedAddress({ orgId: ORG_ID });
    const shipment = await seedShipment({ orgId: ORG_ID, originAddressId });
    await seedDriver({ userId: DRIVER_ID, orgId: ORG_ID });
    expect((await assign(shipment.id, DRIVER_ID)).status).toBe(400);
  });

  test("404 when the driver is not a member of the org", async () => {
    const shipment = await readyShipment();
    // no driver seeded
    expect((await assign(shipment.id, "ghost_driver")).status).toBe(404);
  });

  test("400 when the driver is not available", async () => {
    const shipment = await readyShipment();
    await seedDriver({ userId: DRIVER_ID, orgId: ORG_ID, isAvailable: false });
    expect((await assign(shipment.id, DRIVER_ID)).status).toBe(400);
  });

  test("404 when the shipment belongs to another org", async () => {
    await seedOrg({ id: "org_other" });
    const originAddressId = await seedAddress({ orgId: "org_other" });
    const shipment = await seedShipment({
      orgId: "org_other",
      originAddressId,
      clientContactEmail: "client@example.com",
    });
    await seedDriver({ userId: DRIVER_ID, orgId: ORG_ID });
    // Logged in as ORG_ID's owner — the other org's shipment is invisible.
    expect((await assign(shipment.id, DRIVER_ID)).status).toBe(404);
  });
});

describe("cross-org isolation", () => {
  test("GET /:id returns 404 for another org's shipment", async () => {
    await seedOrg({ id: "org_other" });
    const shipment = await seedShipment({ orgId: "org_other" });
    const res = await app.request(`/api/shipments/${shipment.id}`);
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/shipments/:id/cancel", () => {
  function cancel(shipmentId: string) {
    return app.request(`/api/shipments/${shipmentId}/cancel`, { method: "PATCH" });
  }

  test("cancels an active shipment (200) and sets status to cancelled", async () => {
    const shipment = await seedShipment({ orgId: ORG_ID, status: "created" });
    const res = await cancel(shipment.id);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ status: "cancelled" });
  });

  test("400 when the shipment is already delivered", async () => {
    const shipment = await seedShipment({ orgId: ORG_ID, status: "delivered" });
    expect((await cancel(shipment.id)).status).toBe(400);
  });

  test("400 when the shipment is already cancelled", async () => {
    const shipment = await seedShipment({ orgId: ORG_ID, status: "cancelled" });
    expect((await cancel(shipment.id)).status).toBe(400);
  });
});

describe("GET /api/shipments pagination", () => {
  test("pages through results with the cursor (PAGE_LIMIT = 20)", async () => {
    // 21 shipments → first page has 20 + a nextCursor, second page has the last 1.
    for (let i = 0; i < 21; i++) {
      await seedShipment({ orgId: ORG_ID });
    }

    const page1 = await (await app.request("/api/shipments")).json();
    expect(page1.data).toHaveLength(20);
    expect(page1.nextCursor).not.toBeNull();

    const page2 = await (
      await app.request(`/api/shipments?cursor=${page1.nextCursor}`)
    ).json();
    expect(page2.data).toHaveLength(1);
    expect(page2.nextCursor).toBeNull();

    // No overlap between the two pages.
    const ids = new Set(page1.data.map((s: { id: string }) => s.id));
    expect(ids.has(page2.data[0].id)).toBe(false);
  });
});
