import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { env } from "../core/env";

export const db = drizzle(env.DATABASE_URL);
