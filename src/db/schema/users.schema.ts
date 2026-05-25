import { uuidv7 } from "uuidv7";
import { pgTable, uuid, varchar, integer } from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: uuid().primaryKey().$defaultFn(() => uuidv7()),
  name: varchar({ length: 255 }).notNull(),
  age: integer().notNull(),
  email: varchar({ length: 255 }).notNull().unique(),
});
