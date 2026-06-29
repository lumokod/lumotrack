import { Worker } from "bullmq";
import { connection } from "./client";
import type { NotificationJobData } from "./jobs";
import { sendShipmentUpdateEmail } from "@/lib/mail/shipments";
import { sendVerificationEmail } from "@/lib/mail/auth";
import { sendReviewRequestEmail } from "@/lib/mail/reviews";
import { sendShipmentUpdateSms } from "@/lib/sms/shipments";
import { sendReviewRequestSms } from "@/lib/sms/reviews";

type Handler = (data: NotificationJobData) => Promise<unknown>;

type NotificationHandlers = {
  [T in NotificationJobData["type"]]: (data: Extract<NotificationJobData, { type: T }>) => Promise<unknown>;
};

const handlers: NotificationHandlers = {
  "shipment-update": (data) => sendShipmentUpdateEmail(data.email, data.shipmentContent, data.eventStatus),
  verification: (data) => sendVerificationEmail(data.email, data.url),
  "sms-shipment-update": (data) =>
    sendShipmentUpdateSms(data.phone, data.shipmentContent, data.eventStatus, data.deliveryCode),
  "review-request": (data) => sendReviewRequestEmail(data.email, data.shipmentContent, data.reviewUrl),
  "sms-review-request": (data) => sendReviewRequestSms(data.phone, data.shipmentContent, data.reviewUrl),
};

export function startNotificationWorker() {
  const worker = new Worker<NotificationJobData>(
    "notifications",
    async (job) => {
     const handler = handlers[job.data.type] as Handler;
     await handler(job.data);
    },
    { connection },
  );

  worker.on("failed", (job, err) => {
    const final = job && job.attemptsMade >= (job.opts.attempts ?? 1);
    console.error(
      `Notification job ${job?.id} ${final ? "permanently failed" : "failed, will retry"}:`,
      err.message,
    );
  });

  return worker;
}
