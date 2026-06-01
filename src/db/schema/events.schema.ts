import { uuidv7 } from "uuidv7";
import {
  pgTable,
  uuid,
  timestamp,
  pgEnum,
  varchar,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { shipments } from "./shipments.schema";

export const eventStatusEnum = pgEnum("event_status", [
  "departed",
  "arrived",
  "delivery_attempted",
  "held_at_facility",
  "customs_cleared",
  "out_for_delivery",
  "delivered",
  "returned",
]);

export const events = pgTable(
  "events",
  {
    id: uuid()
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    status: eventStatusEnum().notNull(),
    description: varchar({ length: 255 }),
    address: varchar({ length: 255 }).notNull(),
    shipmentId: uuid("shipment_id")
      .notNull()
      .references(() => shipments.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
);

export const eventsRelations = relations(events, ({ one }) => ({
  shipment: one(shipments, {
    fields: [events.shipmentId],
    references: [shipments.id],
  }),
}));
