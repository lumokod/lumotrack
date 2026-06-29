import app from "./core/app";
import { startNotificationWorker } from "./lib/queue";

startNotificationWorker();

export default {
  port: 3000,
  fetch: app.fetch,
};
