import { Worker } from "bullmq";
import { connection } from "./client";
import type { NotificationJobData } from "./jobs";
import { sendShipmentUpdateEmail } from "@/lib/mail/shipments";
import { sendVerificationEmail } from "@/lib/mail/auth";
import { sendReviewRequestEmail } from "@/lib/mail/reviews";
import { sendShipmentUpdateSms } from "@/lib/sms/shipments";
import { sendReviewRequestSms } from "@/lib/sms/reviews";

export function startNotificationWorker() {
  const worker = new Worker<NotificationJobData>(
    "notifications",
    async (job) => {
      const data = job.data;
      if (data.type === "shipment-update") {
        await sendShipmentUpdateEmail(data.email, data.shipmentContent, data.eventStatus);
      } else if (data.type === "verification") {
        await sendVerificationEmail(data.email, data.url);
      } else if (data.type === "sms-shipment-update") {
        await sendShipmentUpdateSms(data.phone, data.shipmentContent, data.eventStatus, data.deliveryCode);
      } else if (data.type === "review-request") {
        await sendReviewRequestEmail(data.email, data.shipmentContent, data.reviewUrl);
      } else if (data.type === "sms-review-request") {
        await sendReviewRequestSms(data.phone, data.shipmentContent, data.reviewUrl);
      }
    },
    { connection },
  );

  worker.on("failed", (job, err) => {
    console.error(`Notification job ${job?.id} failed:`, err.message);
  });

  return worker;
}
