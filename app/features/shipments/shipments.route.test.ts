import { describe, test, expect, beforeEach } from "bun:test";
import app from "@/core/app";
import { loginAs, logout, denyPermission } from "../../../test/helpers/auth";
import { resetDb, seedOrg, seedUserMember } from "../../../test/helpers/db";

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
