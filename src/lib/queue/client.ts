import { Queue } from "bullmq";
import { env } from "@/core/env";
import type { NotificationJobData } from "./jobs";

export const connection = { url: env.REDIS_URL };

export const notificationQueue = new Queue<NotificationJobData>("notifications", { connection });

export function addNotification(data: NotificationJobData) {
  return notificationQueue.add(data.type, data, {
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 },
    removeOnComplete: 100,
    removeOnFail: 1000,
  });
}
