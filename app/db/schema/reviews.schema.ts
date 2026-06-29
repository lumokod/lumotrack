import { uuidv7 } from "uuidv7";
import {
  pgTable,
  uuid,
  text,
  smallint,
  varchar,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { shipments } from "./shipments.schema";
import { organization, user } from "./auth.schema";

export const reviews = pgTable(
  "reviews",
  {
    id: uuid()
      .primaryKey()
      .$defaultFn(() => uuidv7()),

    // One review per shipment — the unique constraint is also the
    // duplicate-submission guard.
    shipmentId: uuid("shipment_id")
      .notNull()
      .unique()
      .references(() => shipments.id, { onDelete: "cascade" }),

    // Denormalized from the shipment so "avg rating per org/driver" needs no join.
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    driverUserId: text("driver_user_id").references(() => user.id, {
      onDelete: "set null",
    }),

    rating: smallint("rating").notNull(), // 1–5, enforced in validation
    comment: varchar("comment", { length: 1000 }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("reviews_org_idx").on(t.organizationId),
    index("reviews_driver_idx").on(t.driverUserId),
  ],
);

export const reviewsRelations = relations(reviews, ({ one }) => ({
  shipment: one(shipments, {
    fields: [reviews.shipmentId],
    references: [shipments.id],
  }),
  organization: one(organization, {
    fields: [reviews.organizationId],
    references: [organization.id],
  }),
  driver: one(user, {
    fields: [reviews.driverUserId],
    references: [user.id],
  }),
}));
