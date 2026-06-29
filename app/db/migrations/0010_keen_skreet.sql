ALTER TABLE "addresses" RENAME COLUMN "org_id" TO "organization_id";--> statement-breakpoint
ALTER TABLE "addresses" DROP CONSTRAINT "addresses_org_id_organization_id_fk";
--> statement-breakpoint
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;