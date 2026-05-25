import { Hono } from "hono";
import { authRoutes } from "../features/auth/auth.route";
import { sellerRoutes } from "../features/seller/seller.route";
import { deliveryPartnerRoutes } from "../features/delivery-partner/delivery-partner.route";
import { HTTPException } from "hono/http-exception";

const app = new Hono();

app.route("/api/auth", authRoutes);
app.route("/api/seller", sellerRoutes);
app.route("/api/delivery-partner", deliveryPartnerRoutes);

app.get("/", (c) => c.text("Hello Hono!"));

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return err.getResponse();
  }
  return c.json({ error: "Internal server error" }, 500);
});

export default app;
