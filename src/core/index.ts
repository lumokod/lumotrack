import { Hono } from "hono";
import { authRoutes } from "../features/auth/auth.routes";

const app = new Hono();

app.route("/api/auth", authRoutes);

app.get("/", (c) => c.text("Hello Hono!"));

export default app;
