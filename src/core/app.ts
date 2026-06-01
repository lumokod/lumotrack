import { Hono } from "hono";
import { authRoutes } from "../features/auth/auth.route";
import { driversRoutes } from "../features/drivers/drivers.route";
import { shipmentsRoutes } from "../features/shipments/shipments.route";
import { aiRoutes } from "../features/ai/ai.route";
import { eventsRoutes } from "../features/events/events.route";
import { HTTPException } from "hono/http-exception";

const app = new Hono();

app.route("/api/auth", authRoutes);
app.route("/api/drivers", driversRoutes);
app.route("/api/shipments", shipmentsRoutes);
app.route("/api/shipments", eventsRoutes);
app.route("/api/ai", aiRoutes);

app.get("/", (c) => c.text("Hello Hono!"));

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return err.getResponse();
  }
  return c.json({ error: "Internal server error" }, 500);
});

export default app;
