import { describe, test, expect, beforeEach } from "bun:test";
import app from "@/core/app";
import { loginAs } from "../../../test/helpers/auth";
import { resetDb, seedOrg, seedUserMember, seedTag } from "../../../test/helpers/db";

const ORG_ID = "org_test_1";
const USER_ID = "user_test_1";

beforeEach(async () => {
  await resetDb();
  await seedOrg({ id: ORG_ID });
  await seedUserMember({ userId: USER_ID, orgId: ORG_ID, role: "owner" });
  loginAs({ userId: USER_ID, orgId: ORG_ID });
});

describe("tags CRUD", () => {
  test("creates (201) then deletes (204) a tag", async () => {
    const create = await app.request("/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "vip" }),
    });
    expect(create.status).toBe(201);
    const tag = await create.json();

    const del = await app.request(`/api/tags/${tag.id}`, { method: "DELETE" });
    expect(del.status).toBe(204);
  });

  test("404 deleting a tag that belongs to another org", async () => {
    await seedOrg({ id: "org_other" });
    const otherTagId = await seedTag({ orgId: "org_other" });

    // Logged in as ORG_ID's owner — the other org's tag is not deletable.
    const res = await app.request(`/api/tags/${otherTagId}`, { method: "DELETE" });
    expect(res.status).toBe(404);
  });
});
