import type { EventStatus } from "@/features/events/events.types";
import { resend, FROM } from "./client";

const SHIPMENT_UPDATE_MESSAGES: Partial<Record<EventStatus, string>> = {
  departed: "Your shipment has been picked up and is on its way.",
  out_for_delivery: "Your shipment is out for delivery today.",
  delivered: "Your shipment has been delivered. Thank you!",
  delivery_attempted: "A delivery attempt was made but was unsuccessful. We'll try again soon.",
};

export async function sendShipmentUpdateEmail(
  email: string,
  shipmentContent: string,
  eventStatus: EventStatus,
) {
  const message = SHIPMENT_UPDATE_MESSAGES[eventStatus];
  if (!message) return;

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: `Update on your shipment: ${eventStatus.replace(/_/g, " ")}`,
    html: `
      <p>Here's an update on your shipment: <strong>${shipmentContent}</strong></p>
      <p>${message}</p>
    `,
  });
}
