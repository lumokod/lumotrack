CREATE TYPE "public"."verification_status" AS ENUM('pending', 'verified', 'rejected');--> statement-breakpoint
CREATE TABLE "organization_verification" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"legal_name" text,
	"registration_number" text,
	"tax_id" text,
	"contact_phone" text,
	"contact_email" text,
	"address_line" text,
	"documents" jsonb,
	"status" "verification_status" DEFAULT 'pending' NOT NULL,
	"rejection_reason" text,
	"reviewed_by" text,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "organization_verification_organization_id_unique" UNIQUE("organization_id")
);
--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "verification_status" text DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "organization_verification" ADD CONSTRAINT "organization_verification_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_verification" ADD CONSTRAINT "organization_verification_reviewed_by_user_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "org_verification_status_idx" ON "organization_verification" USING btree ("status");