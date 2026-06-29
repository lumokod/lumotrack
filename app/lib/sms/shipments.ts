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
  deliveryCode?: string,
) {
  const label = EVENT_STATUS_LABEL[eventStatus];

  const body =
    eventStatus === "out_for_delivery" && deliveryCode
      ? `LumoTrack: Your shipment "${shipmentContent}" is out for delivery. Share this code with your driver to confirm delivery: ${deliveryCode}`
      : `LumoTrack: Your shipment "${shipmentContent}" is now ${label}.`;

  await twilioClient.messages.create({ from: FROM, to: phone, body });
}
