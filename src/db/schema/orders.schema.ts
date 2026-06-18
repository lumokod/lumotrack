import {
  pgTable,
  uuid,
  integer,
  timestamp,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { products } from "./products.schema";
import { shipments } from "./shipments.schema";

// Junction (many-to-many) between shipments and products: one row per product
// in a shipment, carrying how many units of it the shipment holds.
export const orders = pgTable(
  "orders",
  {
    shipmentId: uuid("shipment_id")
      .notNull()
      .references(() => shipments.id, { onDelete: "cascade" }),
    // restrict: a product that appears in a shipment cannot be hard-deleted,
    // so shipment contents stay intact.
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    quantity: integer().notNull(), // >= 1, enforced in validation
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [primaryKey({ columns: [t.shipmentId, t.productId] })],
);

export const ordersRelations = relations(orders, ({ one }) => ({
  shipment: one(shipments, {
    fields: [orders.shipmentId],
    references: [shipments.id],
  }),
  product: one(products, {
    fields: [orders.productId],
    references: [products.id],
  }),
}));
