import { describe, test, expect, beforeEach } from "bun:test";
import app from "@/core/app";
import { loginAs } from "../../../test/helpers/auth";
import {
  resetDb,
  seedOrg,
  seedUserMember,
  seedAddress,
} from "../../../test/helpers/db";

const ORG_ID = "org_test_1";
const USER_ID = "user_test_1";

beforeEach(async () => {
  await resetDb();
  await seedOrg({ id: ORG_ID });
  await seedUserMember({ userId: USER_ID, orgId: ORG_ID, role: "owner" });
  loginAs({ userId: USER_ID, orgId: ORG_ID });
});

function createBody(overrides: Record<string, unknown> = {}) {
  return { street: "1 Main St", city: "Beirut", country: "Lebanon", ...overrides };
}

function post(body: unknown) {
  return app.request("/api/addresses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("addresses CRUD", () => {
  test("creates (201) and then lists the address", async () => {
    const res = await post(createBody());
    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({
      city: "Beirut",
      organizationId: ORG_ID,
    });

    const list = await (await app.request("/api/addresses")).json();
    expect(list).toHaveLength(1);
  });

  test("400 on missing required field (city)", async () => {
    const { city, ...rest } = createBody();
    expect((await post(rest)).status).toBe(400);
  });

  test("deletes an address (204)", async () => {
    const id = await seedAddress({ orgId: ORG_ID });
    const res = await app.request(`/api/addresses/${id}`, { method: "DELETE" });
    expect(res.status).toBe(204);
  });

  test("404 deleting an address that belongs to another org", async () => {
    await seedOrg({ id: "org_other" });
    const otherId = await seedAddress({ orgId: "org_other" });
    const res = await app.request(`/api/addresses/${otherId}`, { method: "DELETE" });
    expect(res.status).toBe(404);
  });
});
