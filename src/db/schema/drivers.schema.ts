import { uuidv7 } from "uuidv7";
import {
  pgTable,
  text,
  uuid,
  varchar,
  geometry,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { user } from "./auth.schema";

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
