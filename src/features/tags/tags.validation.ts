import { z } from "zod";

export const createTagSchema = z.object({
  // Tag names are normalized to lowercase + trimmed so the
  // unique(organizationId, name) constraint is effectively case-insensitive.
  name: z.string().trim().toLowerCase().min(1).max(50),
  description: z.string().trim().max(255).optional().nullable(),
});

export const updateTagSchema = createTagSchema.partial();

export const setShipmentTagsSchema = z.object({
  tagIds: z.array(z.uuidv7()).max(50),
});
