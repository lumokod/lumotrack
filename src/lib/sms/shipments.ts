import { twilioClient, FROM } from "./client";
import type { EventStatus } from "@/features/events/events.types";

const EVENT_STATUS_LABEL: Record<EventStatus, string> = {
  departed: "picked up",
  arrived: "in transit",
  out_for_delivery: "out for delivery",
  delivered: "delivered",
  delivery_attempted: "delivery attempted",
  held_at_facility: "held at facility",
  customs_cleared: "customs cleared",
  returned: "returned",
};

export async function sendShipmentUpdateSms(
  phone: string,
  shipmentContent: string,
  eventStatus: EventStatus,
) {
  const label = EVENT_STATUS_LABEL[eventStatus];
  await twilioClient.messages.create({
    from: FROM,
    to: phone,
    body: `LumoTrack: Your shipment "${shipmentContent}" is now ${label}.`,
  });
}
