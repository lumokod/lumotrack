import { uuidv7 } from "uuidv7";
import { pgTable, text, uuid, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { user } from "./auth.schema";
import { shipments } from "./shipments.schema";

export const sellers = pgTable("sellers", {
  id: uuid().primaryKey().$defaultFn(() => uuidv7()),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
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
  shipments: many(shipments),
}));
