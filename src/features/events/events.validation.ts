import { z } from "zod";
import { eventStatusEnum } from "@/db/schema";

export const createEventSchema = z.object({
  status: z.enum(eventStatusEnum.enumValues),
  address: z.string().min(1).max(255),
  description: z.string().max(255).optional(),
  confirmationCode: z.string().length(6).optional(),
});
