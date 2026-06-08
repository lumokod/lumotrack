import type { z } from "zod";
import type { createEventSchema } from "./events.validation";
import type { events } from "@/db/schema";

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type Event = typeof events.$inferSelect;
export type EventStatus = Event["status"];
