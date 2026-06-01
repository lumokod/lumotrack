CREATE TYPE "public"."event_status" AS ENUM('departed', 'arrived', 'delivery_attempted', 'held_at_facility', 'customs_cleared', 'out_for_delivery', 'delivered', 'returned');--> statement-breakpoint
ALTER TYPE "public"."shipment_status" ADD VALUE 'picked_up' BEFORE 'in_transit';--> statement-breakpoint
ALTER TYPE "public"."shipment_status" ADD VALUE 'out_for_delivery' BEFORE 'delivered';--> statement-breakpoint
CREATE TABLE "addresses" (
	"id" uuid PRIMARY KEY NOT NULL,
	"street" varchar(255) NOT NULL,
	"city" varchar(100) NOT NULL,
	"state" varchar(100) NOT NULL,
	"zip_code" varchar(20) NOT NULL,
	"country" varchar(100) NOT NULL,
	"seller_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"status" "event_status" NOT NULL,
	"description" varchar(255),
	"location" geometry(point) NOT NULL,
	"shipment_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_seller_id_sellers_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."sellers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "events_location_spatial_idx" ON "events" USING gist ("location");