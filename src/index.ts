import app from "./core/app";
import { startEmailWorker } from "./lib/queue";

startEmailWorker();

export default {
  port: 3000,
  fetch: app.fetch,
};
