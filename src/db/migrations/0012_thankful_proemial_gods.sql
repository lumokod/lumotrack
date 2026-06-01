ALTER TABLE "addresses" DROP CONSTRAINT "addresses_seller_id_sellers_id_fk";--> statement-breakpoint
ALTER TABLE "driver_locations" DROP CONSTRAINT "driver_locations_driver_id_drivers_id_fk";--> statement-breakpoint
ALTER TABLE "shipments" DROP CONSTRAINT "shipments_seller_id_sellers_id_fk";--> statement-breakpoint
ALTER TABLE "shipments" DROP CONSTRAINT "shipments_driver_id_drivers_id_fk";--> statement-breakpoint
ALTER TABLE "shipments" DROP CONSTRAINT IF EXISTS "shipments_org_id_organization_id_fk";--> statement-breakpoint
ALTER TABLE "shipments" DROP COLUMN IF EXISTS "org_id";--> statement-breakpoint
ALTER TABLE "addresses" RENAME COLUMN "seller_id" TO "org_id";--> statement-breakpoint
ALTER TABLE "driver_locations" RENAME COLUMN "driver_id" TO "user_id";--> statement-breakpoint
ALTER TABLE "shipments" RENAME COLUMN "seller_id" TO "org_id";--> statement-breakpoint
ALTER TABLE "shipments" RENAME COLUMN "driver_id" TO "driver_user_id";--> statement-breakpoint
ALTER TABLE "drivers" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "sellers" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "drivers" CASCADE;--> statement-breakpoint
DROP TABLE "sellers" CASCADE;--> statement-breakpoint
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "driver_locations" ADD CONSTRAINT "driver_locations_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_driver_user_id_user_id_fk" FOREIGN KEY ("driver_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
