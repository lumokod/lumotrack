ALTER TABLE "user" ALTER COLUMN "role" SET DEFAULT 'user';--> statement-breakpoint
ALTER TABLE "sellers" ADD COLUMN "org_id" text;--> statement-breakpoint
ALTER TABLE "sellers" ADD CONSTRAINT "sellers_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organization"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "user_type";--> statement-breakpoint
DROP TYPE "public"."user_type";