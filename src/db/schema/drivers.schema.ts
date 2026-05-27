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

export const drivers = pgTable("drivers", {
  id: uuid()
    .primaryKey()
    .$defaultFn(() => uuidv7()),
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

export const driverLocations = pgTable(
  "driver_locations",
  {
    id: uuid()
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    driverId: uuid("driver_id")
      .notNull()
      .references(() => drivers.id, { onDelete: "cascade" }),
    location: geometry("location", {
      type: "point",
      mode: "xy",
      srid: 4326,
    }).notNull(),
    label: varchar({ length: 100 }),
  },
  (t) => [
    index("driver_locations_location_spatial_idx").using("gist", t.location),
  ],
);

export const driversRelations = relations(drivers, ({ one, many }) => ({
  user: one(user, {
    fields: [drivers.userId],
    references: [user.id],
  }),
  locations: many(driverLocations),
  shipments: many(shipments),
}));

export const driverLocationsRelations = relations(
  driverLocations,
  ({ one }) => ({
    driver: one(drivers, {
      fields: [driverLocations.driverId],
      references: [drivers.id],
    }),
  }),
);
