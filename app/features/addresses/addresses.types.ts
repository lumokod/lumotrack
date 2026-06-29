import type { z } from "zod";
import type { createAddressSchema } from "./addresses.validation";
import type { addresses } from "@/db/schema";

export type CreateAddressInput = z.infer<typeof createAddressSchema>;
export type Address = typeof addresses.$inferSelect;
