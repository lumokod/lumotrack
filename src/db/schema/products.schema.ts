import { uuidv7 } from "uuidv7";
import {
  pgTable,
  uuid,
  text,
  varchar,
  real,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { organization } from "./auth.schema";
import { orders } from "./orders.schema";

export const products = pgTable(
  "products",
  {
    id: uuid()
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    name: varchar({ length: 100 }).notNull(),
    sku: varchar({ length: 50 }),
    description: varchar({ length: 500 }),
    // Per-unit weight — used to derive a shipment's total from its line items.
    weight: real().notNull(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    // SKUs are unique within an org (only enforced for rows that set one —
    // Postgres allows multiple NULLs).
    unique("products_org_sku_unique").on(t.organizationId, t.sku),
  ],
);

export const productsRelations = relations(products, ({ one, many }) => ({
  org: one(organization, {
    fields: [products.organizationId],
    references: [organization.id],
  }),
  orders: many(orders),
}));
