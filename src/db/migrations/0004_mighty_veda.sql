ALTER TABLE "delivery_partner_locations" RENAME TO "driver_locations";--> statement-breakpoint
ALTER TABLE "delivery_partners" RENAME TO "drivers";--> statement-breakpoint
ALTER TABLE "driver_locations" RENAME COLUMN "delivery_partner_id" TO "driver_id";--> statement-breakpoint
ALTER TABLE "shipments" RENAME COLUMN "delivery_partner_id" TO "driver_id";--> statement-breakpoint
ALTER TABLE "drivers" DROP CONSTRAINT "delivery_partners_user_id_unique";--> statement-breakpoint
ALTER TABLE "driver_locations" DROP CONSTRAINT "delivery_partner_locations_delivery_partner_id_delivery_partners_id_fk";
--> statement-breakpoint
ALTER TABLE "drivers" DROP CONSTRAINT "delivery_partners_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "shipments" DROP CONSTRAINT "shipments_delivery_partner_id_delivery_partners_id_fk";
--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "user_type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."user_type";--> statement-breakpoint
CREATE TYPE "public"."user_type" AS ENUM('seller', 'driver');--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "user_type" SET DATA TYPE "public"."user_type" USING "user_type"::"public"."user_type";--> statement-breakpoint
DROP INDEX "delivery_partner_locations_location_spatial_idx";--> statement-breakpoint
ALTER TABLE "driver_locations" ADD CONSTRAINT "driver_locations_driver_id_drivers_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_driver_id_drivers_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "driver_locations_location_spatial_idx" ON "driver_locations" USING gist ("location");--> statement-breakpoint
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_user_id_unique" UNIQUE("user_id");