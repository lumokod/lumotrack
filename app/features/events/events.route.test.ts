import { describe, test, expect, beforeEach } from "bun:test";
import app from "@/core/app";
import { loginAs } from "../../../test/helpers/auth";
import { resetDb, seedOrg, seedDriver, seedShipment } from "../../../test/helpers/db";

const ORG_ID = "org_test_1";
const DRIVER_ID = "driver_test_1";

// The driver is the actor here — events are posted by the assigned driver.
beforeEach(async () => {
  await resetDb();
  await seedOrg({ id: ORG_ID });
  await seedDriver({ userId: DRIVER_ID, orgId: ORG_ID });
  loginAs({ userId: DRIVER_ID, orgId: ORG_ID, role: "driver" });
});

function postEvent(shipmentId: string, body: unknown) {
  return app.request(`/api/shipments/${shipmentId}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function shipmentStatus(shipmentId: string) {
  const res = await app.request(`/api/shipments/${shipmentId}`);
  return (await res.json()).status;
}

describe("POST /api/shipments/:id/events", () => {
  test("201 and advances the shipment status (departed → picked_up)", async () => {
    const shipment = await seedShipment({ orgId: ORG_ID, driverUserId: DRIVER_ID });

    const res = await postEvent(shipment.id, { status: "departed", address: "Hub A" });
    expect(res.status).toBe(201);
    expect(await shipmentStatus(shipment.id)).toBe("picked_up");
  });

  test("404 when the shipment is not assigned to this driver", async () => {
    const shipment = await seedShipment({ orgId: ORG_ID }); // unassigned
    const res = await postEvent(shipment.id, { status: "departed", address: "Hub A" });
    expect(res.status).toBe(404);
  });

  test("400 marking delivered without a confirmation code", async () => {
    const shipment = await seedShipment({
      orgId: ORG_ID,
      driverUserId: DRIVER_ID,
      deliveryCode: "123456",
    });
    const res = await postEvent(shipment.id, { status: "delivered", address: "Door" });
    expect(res.status).toBe(400);
  });

  test("400 marking delivered with the wrong confirmation code", async () => {
    const shipment = await seedShipment({
      orgId: ORG_ID,
      driverUserId: DRIVER_ID,
      deliveryCode: "123456",
    });
    const res = await postEvent(shipment.id, {
      status: "delivered",
      address: "Door",
      confirmationCode: "000000",
    });
    expect(res.status).toBe(400);
  });

  test("201 marking delivered with the correct confirmation code", async () => {
    const shipment = await seedShipment({
      orgId: ORG_ID,
      driverUserId: DRIVER_ID,
      deliveryCode: "123456",
    });
    const res = await postEvent(shipment.id, {
      status: "delivered",
      address: "Door",
      confirmationCode: "123456",
    });
    expect(res.status).toBe(201);
    expect(await shipmentStatus(shipment.id)).toBe("delivered");
  });
});
