import { uuidv7 } from "uuidv7";
import {
  pgTable,
  text,
  uuid,
  timestamp,
  pgEnum,
  geometry,
  index,
  varchar,
  real,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { user, organization } from "./auth.schema";
import { events } from "./events.schema";
import { addresses } from "./addresses.schema";
import { shipmentTags } from "./tags.schema";
import { orders } from "./orders.schema";

export const shipmentStatusEnum = pgEnum("shipment_status", [
  "created",
  "assigned",
  "picked_up",
  "in_transit",
  "out_for_delivery",
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
    }),
    destination: geometry("destination", {
      type: "point",
      mode: "xy",
      srid: 4326,
    }).notNull(),
    clientContactEmail: text("client_contact_email"),
    clientContactPhone: varchar("client_contact_phone", { length: 20 }),
    deliveryCode: varchar("delivery_code", { length: 6 }),
    originAddressId: uuid("origin_address_id").references(() => addresses.id, {
      onDelete: "set null",
    }),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    driverUserId: text("driver_user_id").references(() => user.id, {
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

export const shipmentsRelations = relations(shipments, ({ one, many }) => ({
  org: one(organization, {
    fields: [shipments.organizationId],
    references: [organization.id],
  }),
  driver: one(user, {
    fields: [shipments.driverUserId],
    references: [user.id],
  }),
  events: many(events),
  originAddress: one(addresses, {
    fields: [shipments.originAddressId],
    references: [addresses.id],
  }),
  shipmentTags: many(shipmentTags),
  orders: many(orders),
}));
