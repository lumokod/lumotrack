import type { z } from "zod";
import type { createEventSchema } from "./events.validation";

export type CreateEventInput = z.infer<typeof createEventSchema>;
