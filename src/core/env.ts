import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  ANTHROPIC_API_KEY: z.string().min(1),
  ENVIRONMENT: z.enum(["development", "production", "test"]),
  REDIS_URL: z.string().min(1),
  BETTER_AUTH_SECRET: z.string().min(1),
  BETTER_AUTH_URL: z.url(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:");
  console.error(z.flattenError(parsed.error).fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
