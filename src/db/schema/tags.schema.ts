import { uuidv7 } from "uuidv7";
import {
  pgTable,
  uuid,
  text,
  varchar,
  timestamp,
  unique,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { organization } from "./auth.schema";
import { shipments } from "./shipments.schema";

export const tags = pgTable(
  "tags",
  {
    id: uuid()
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    name: varchar({ length: 50 }).notNull(),
    description: varchar({ length: 255 }),
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
    // Tag names are unique within an org, not globally.
    unique("tags_org_name_unique").on(t.organizationId, t.name),
  ],
);

// Junction table for the many-to-many between shipments and tags.
export const shipmentTags = pgTable(
  "shipment_tags",
  {
    shipmentId: uuid("shipment_id")
      .notNull()
      .references(() => shipments.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.shipmentId, t.tagId] })],
);

export const tagsRelations = relations(tags, ({ one, many }) => ({
  org: one(organization, {
    fields: [tags.organizationId],
    references: [organization.id],
  }),
  shipmentTags: many(shipmentTags),
}));

export const shipmentTagsRelations = relations(shipmentTags, ({ one }) => ({
  shipment: one(shipments, {
    fields: [shipmentTags.shipmentId],
    references: [shipments.id],
  }),
  tag: one(tags, {
    fields: [shipmentTags.tagId],
    references: [tags.id],
  }),
}));
