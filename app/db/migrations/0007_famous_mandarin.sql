ALTER TABLE "shipments" RENAME COLUMN "org_id" TO "organization_id";--> statement-breakpoint
ALTER TABLE "shipments" DROP CONSTRAINT "shipments_org_id_organization_id_fk";
--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;