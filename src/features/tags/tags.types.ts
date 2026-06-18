import type { z } from "zod";
import type {
  createTagSchema,
  updateTagSchema,
  setShipmentTagsSchema,
} from "./tags.validation";
import type { tags } from "@/db/schema";

export type CreateTagInput = z.infer<typeof createTagSchema>;
export type UpdateTagInput = z.infer<typeof updateTagSchema>;
export type SetShipmentTagsInput = z.infer<typeof setShipmentTagsSchema>;
export type Tag = typeof tags.$inferSelect;
