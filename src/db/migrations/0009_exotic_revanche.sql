ALTER TABLE "shipments" DROP CONSTRAINT "shipments_origin_address_id_addresses_id_fk";
--> statement-breakpoint
ALTER TABLE "shipments" ALTER COLUMN "origin_address_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_origin_address_id_addresses_id_fk" FOREIGN KEY ("origin_address_id") REFERENCES "public"."addresses"("id") ON DELETE set null ON UPDATE no action;