import { uuidv7 } from "uuidv7";
import { pgTable, uuid, text, varchar, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { organization } from "./auth.schema";

export const addresses = pgTable("addresses", {
  id: uuid()
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  street: varchar({ length: 255 }).notNull(),
  city: varchar({ length: 100 }).notNull(),
  state: varchar({ length: 100 }),
  zipCode: varchar("zip_code", { length: 20 }),
  country: varchar({ length: 100 }).notNull(),
  orgId: text("org_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const addressesRelations = relations(addresses, ({ one }) => ({
  org: one(organization, {
    fields: [addresses.orgId],
    references: [organization.id],
  }),
}));
