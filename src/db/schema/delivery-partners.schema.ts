import { uuidv7 } from "uuidv7";
import {
  pgTable,
  text,
  uuid,
  timestamp,
  doublePrecision,
  integer,
  varchar,
  geometry,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { user } from "./auth.schema";
import { shipments } from "./shipments.schema";

export const deliveryPartners = pgTable("delivery_partners", {
  id: uuid().primaryKey().$defaultFn(() => uuidv7()),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  serviceRadiusKm: doublePrecision("service_radius_km"),
  maxHandlingCapacity: integer("max_handling_capacity"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const deliveryPartnerLocations = pgTable(
  "delivery_partner_locations",
  {
    id: uuid().primaryKey().$defaultFn(() => uuidv7()),
    deliveryPartnerId: uuid("delivery_partner_id")
      .notNull()
      .references(() => deliveryPartners.id, { onDelete: "cascade" }),
    location: geometry("location", { type: "point", mode: "xy", srid: 4326 }).notNull(),
    label: varchar({ length: 100 }),
  },
  (t) => [index("delivery_partner_locations_location_spatial_idx").using("gist", t.location)],
);

export const deliveryPartnersRelations = relations(
  deliveryPartners,
  ({ one, many }) => ({
    user: one(user, {
      fields: [deliveryPartners.userId],
      references: [user.id],
    }),
    locations: many(deliveryPartnerLocations),
    shipments: many(shipments),
  })
);

export const deliveryPartnerLocationsRelations = relations(
  deliveryPartnerLocations,
  ({ one }) => ({
    deliveryPartner: one(deliveryPartners, {
      fields: [deliveryPartnerLocations.deliveryPartnerId],
      references: [deliveryPartners.id],
    }),
  })
);
