import { Queue } from "bullmq";
import { env } from "@/core/env";

export const connection = { url: env.REDIS_URL };

export const emailQueue = new Queue("email", { connection });
