import { uuidv7 } from "uuidv7";
import {
  pgTable,
  pgEnum,
  text,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { organization, user } from "./auth.schema";

export const verificationStatusEnum = pgEnum("verification_status", [
  "pending",
  "verified",
  "rejected",
]);

export const organizationVerification = pgTable(
  "organization_verification",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    organizationId: text("organization_id")
      .notNull()
      .unique()
      .references(() => organization.id, { onDelete: "cascade" }),

    // What the seller submits (KYB)
    legalName: text("legal_name"),
    registrationNumber: text("registration_number"),
    taxId: text("tax_id"),
    contactPhone: text("contact_phone"),
    contactEmail: text("contact_email"),
    addressLine: text("address_line"),
    documents: jsonb("documents"),

    // Review workflow
    status: verificationStatusEnum().notNull().default("pending"),
    rejectionReason: text("rejection_reason"),
    reviewedBy: text("reviewed_by").references(() => user.id, {
      onDelete: "set null",
    }),
    reviewedAt: timestamp("reviewed_at"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [index("org_verification_status_idx").on(t.status)],
);

export const organizationVerificationRelations = relations(
  organizationVerification,
  ({ one }) => ({
    organization: one(organization, {
      fields: [organizationVerification.organizationId],
      references: [organization.id],
    }),
    reviewer: one(user, {
      fields: [organizationVerification.reviewedBy],
      references: [user.id],
    }),
  }),
);
