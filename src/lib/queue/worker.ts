import { Worker } from "bullmq";
import { connection } from "./client";
import type { EmailJobData } from "./jobs";
import { sendShipmentUpdateEmail } from "@/lib/mail/shipments";
import { sendVerificationEmail } from "@/lib/mail/auth";

export function startEmailWorker() {
  const worker = new Worker<EmailJobData>(
    "email",
    async (job) => {
      const data = job.data;
      if (data.type === "shipment-update") {
        await sendShipmentUpdateEmail(data.email, data.shipmentContent, data.eventStatus);
      } else if (data.type === "verification") {
        await sendVerificationEmail(data.email, data.url);
      }
    },
    { connection },
  );

  worker.on("failed", (job, err) => {
    console.error(`Email job ${job?.id} failed:`, err.message);
  });

  return worker;
}
