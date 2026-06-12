import { Worker } from "bullmq";
import { connection } from "./client";
import type { NotificationJobData } from "./jobs";
import { sendShipmentUpdateEmail } from "@/lib/mail/shipments";
import { sendVerificationEmail } from "@/lib/mail/auth";
import { sendShipmentUpdateSms } from "@/lib/sms/shipments";

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
      }
    },
    { connection },
  );

  worker.on("failed", (job, err) => {
    console.error(`Notification job ${job?.id} failed:`, err.message);
  });

  return worker;
}
