import { describe, test, expect, beforeEach } from "bun:test";
import { uuidv7 } from "uuidv7";
import app from "@/core/app";
import { buildReviewUrl } from "@/features/reviews/review-link";
import { resetDb, seedOrg, seedShipment } from "../../../test/helpers/db";

const ORG_ID = "org_test_1";

// POST /api/reviews is public — authorization is the signed token in the body,
// not a session. Derive a valid token the same way the app builds review links.
function tokenFor(shipmentId: string) {
  return new URL(buildReviewUrl(shipmentId)).searchParams.get("token")!;
}

function submit(body: unknown) {
  return app.request("/api/reviews", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(async () => {
  await resetDb();
  await seedOrg({ id: ORG_ID });
});

describe("POST /api/reviews", () => {
  test("201 submits a review for a delivered shipment", async () => {
    const shipment = await seedShipment({ orgId: ORG_ID, status: "delivered" });
    const res = await submit({
      shipmentId: shipment.id,
      token: tokenFor(shipment.id),
      rating: 5,
      comment: "Great service",
    });
    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({ rating: 5, organizationId: ORG_ID });
  });

  test("403 with an invalid token", async () => {
    const shipment = await seedShipment({ orgId: ORG_ID, status: "delivered" });
    const res = await submit({
      shipmentId: shipment.id,
      token: "not-a-real-token",
      rating: 5,
    });
    expect(res.status).toBe(403);
  });

  test("404 when the shipment does not exist", async () => {
    const fakeId = uuidv7();
    const res = await submit({
      shipmentId: fakeId,
      token: tokenFor(fakeId), // valid signature, but no such shipment
      rating: 5,
    });
    expect(res.status).toBe(404);
  });

  test("400 when the shipment is not delivered", async () => {
    const shipment = await seedShipment({ orgId: ORG_ID, status: "created" });
    const res = await submit({
      shipmentId: shipment.id,
      token: tokenFor(shipment.id),
      rating: 5,
    });
    expect(res.status).toBe(400);
  });

  test("409 when a review already exists for the shipment", async () => {
    const shipment = await seedShipment({ orgId: ORG_ID, status: "delivered" });
    const body = {
      shipmentId: shipment.id,
      token: tokenFor(shipment.id),
      rating: 4,
    };
    expect((await submit(body)).status).toBe(201);
    expect((await submit(body)).status).toBe(409);
  });
});
