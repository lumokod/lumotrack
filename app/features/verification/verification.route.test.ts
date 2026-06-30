import { describe, test, expect, beforeEach } from "bun:test";
import { eq } from "drizzle-orm";
import app from "@/core/app";
import { db } from "@/core/db";
import { organization } from "@/db/schema";
import { loginAs } from "../../../test/helpers/auth";
import {
  resetDb,
  seedOrg,
  seedUser,
  seedUserMember,
  seedVerification,
} from "../../../test/helpers/db";

const ORG_ID = "org_test_1";
const ADMIN_ID = "admin_test_1";
const USER_ID = "user_test_1";

beforeEach(async () => {
  await resetDb();
  await seedOrg({ id: ORG_ID, verificationStatus: "pending" });
});

async function orgStatus(orgId: string) {
  const [row] = await db
    .select({ status: organization.verificationStatus })
    .from(organization)
    .where(eq(organization.id, orgId));
  return row.status;
}

function review(orgId: string, body: unknown) {
  return app.request(`/api/verification/${orgId}/review`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/verification/pending (admin only)", () => {
  test("403 for a non-admin user", async () => {
    await seedUserMember({ userId: USER_ID, orgId: ORG_ID, role: "owner" });
    loginAs({ userId: USER_ID, orgId: ORG_ID, role: "user" });
    const res = await app.request("/api/verification/pending");
    expect(res.status).toBe(403);
  });

  test("200 for an admin, listing pending submissions", async () => {
    await seedVerification({ orgId: ORG_ID, status: "pending" });
    loginAs({ userId: ADMIN_ID, orgId: null, role: "admin" });

    const res = await app.request("/api/verification/pending");
    expect(res.status).toBe(200);
    const records = await res.json();
    expect(records).toHaveLength(1);
    expect(records[0].organizationId).toBe(ORG_ID);
  });
});

describe("PATCH /api/verification/:orgId/review (admin only)", () => {
  beforeEach(async () => {
    // The reviewer id is written to organization_verification.reviewed_by
    // (FK → user.id), so the admin must exist as a real user row.
    await seedUser({ userId: ADMIN_ID, role: "admin" });
    loginAs({ userId: ADMIN_ID, orgId: null, role: "admin" });
  });

  test("approves a pending submission (200) and flips the org to verified", async () => {
    await seedVerification({ orgId: ORG_ID, status: "pending" });

    const res = await review(ORG_ID, { decision: "verified" });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ status: "verified" });
    expect(await orgStatus(ORG_ID)).toBe("verified");
  });

  test("rejects with a reason (200) and flips the org to rejected", async () => {
    await seedVerification({ orgId: ORG_ID, status: "pending" });

    const res = await review(ORG_ID, {
      decision: "rejected",
      rejectionReason: "Documents unclear",
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ status: "rejected" });
    expect(await orgStatus(ORG_ID)).toBe("rejected");
  });

  test("400 rejecting without a reason", async () => {
    await seedVerification({ orgId: ORG_ID, status: "pending" });
    const res = await review(ORG_ID, { decision: "rejected" });
    expect(res.status).toBe(400);
  });

  test("404 when there is no pending verification", async () => {
    // Org exists but never submitted a verification.
    const res = await review(ORG_ID, { decision: "verified" });
    expect(res.status).toBe(404);
  });
});
