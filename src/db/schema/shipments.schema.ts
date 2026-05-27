import { uuidv7 } from "uuidv7";
import {
  pgTable,
  uuid,
  timestamp,
  pgEnum,
  geometry,
  index,
  varchar,
  real,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { sellers } from "./sellers.schema";
import { drivers } from "./drivers.schema";

export const shipmentStatusEnum = pgEnum("shipment_status", [
  "created",
  "assigned",
  "in_transit",
  "delivered",
  "cancelled",
]);

export const shipments = pgTable(
  "shipments",
  {
    id: uuid()
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    status: shipmentStatusEnum().notNull().default("created"),
    content: varchar({ length: 100 }).notNull(),
    weight: real().notNull(),
    estimatedDelivery: timestamp("estimated_delivery", {
      withTimezone: true,
    }).notNull(),
    destination: geometry("destination", {
      type: "point",
      mode: "xy",
      srid: 4326,
    }).notNull(),
    sellerId: uuid("seller_id")
      .notNull()
      .references(() => sellers.id),
    driverId: uuid("driver_id").references(() => drivers.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    index("shipments_destination_spatial_idx").using("gist", t.destination),
  ],
);

export const shipmentsRelations = relations(shipments, ({ one }) => ({
  seller: one(sellers, {
    fields: [shipments.sellerId],
    references: [sellers.id],
  }),
  driver: one(drivers, {
    fields: [shipments.driverId],
    references: [drivers.id],
  }),
}));
