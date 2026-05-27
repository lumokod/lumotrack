import { Hono } from "hono";
import { getSellerFromSession } from "@/features/sellers/sellers.service";
import { chat } from "./ai.service";

export const aiRoutes = new Hono();

aiRoutes.post("/chat", async (c) => {
  const seller = await getSellerFromSession(c.req.raw.headers);
  const { question } = await c.req.json<{ question: string }>();
  const answer = await chat(question, seller.id);
  return c.json({ answer });
});
