import { uuidv7 } from "uuidv7";
import {
  pgTable,
  text,
  uuid,
  varchar,
  boolean,
  geometry,
  index,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { user, organization } from "./auth.schema";

export const driverLocations = pgTable(
  "driver_locations",
  {
    id: uuid()
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
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

export const driverLocationsRelations = relations(
  driverLocations,
  ({ one }) => ({
    user: one(user, {
      fields: [driverLocations.userId],
      references: [user.id],
    }),
  }),
);

export const driverProfiles = pgTable(
  "driver_profiles",
  {
    id: uuid()
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    isAvailable: boolean("is_available").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [unique().on(t.userId, t.organizationId)],
);

export const driverProfilesRelations = relations(driverProfiles, ({ one }) => ({
  user: one(user, {
    fields: [driverProfiles.userId],
    references: [user.id],
  }),
  org: one(organization, {
    fields: [driverProfiles.organizationId],
    references: [organization.id],
  }),
}));
