import { twilioClient, FROM } from "./client";

export async function sendReviewRequestSms(
  phone: string,
  shipmentContent: string,
  reviewUrl: string,
) {
  const body = `LumoTrack: Your shipment "${shipmentContent}" was delivered. Tell us how it went: ${reviewUrl}`;
  await twilioClient.messages.create({ from: FROM, to: phone, body });
}
