import { uuidv7 } from "uuidv7";
import { pgTable, text, uuid, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { user, organization } from "./auth.schema";
import { shipments } from "./shipments.schema";
import { addresses } from "./addresses.schema";

export const sellers = pgTable("sellers", {
  id: uuid().primaryKey().$defaultFn(() => uuidv7()),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  orgId: text("org_id").references(() => organization.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const sellersRelations = relations(sellers, ({ one, many }) => ({
  user: one(user, {
    fields: [sellers.userId],
    references: [user.id],
  }),
  org: one(organization, {
    fields: [sellers.orgId],
    references: [organization.id],
  }),
  shipments: many(shipments),
  addresses: many(addresses),
}));
