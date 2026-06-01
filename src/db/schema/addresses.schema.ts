import { uuidv7 } from "uuidv7";
import { pgTable, uuid, varchar, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { sellers } from "./sellers.schema";

export const addresses = pgTable("addresses", {
  id: uuid()
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  street: varchar({ length: 255 }).notNull(),
  city: varchar({ length: 100 }).notNull(),
  state: varchar({ length: 100 }),
  zipCode: varchar("zip_code", { length: 20 }),
  country: varchar({ length: 100 }).notNull(),
  sellerId: uuid("seller_id")
    .notNull()
    .references(() => sellers.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const addressesRelations = relations(addresses, ({ one }) => ({
  seller: one(sellers, {
    fields: [addresses.sellerId],
    references: [sellers.id],
  }),
}));
