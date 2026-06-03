ALTER TABLE "invitation" ALTER COLUMN "role" SET DEFAULT 'driver';--> statement-breakpoint
ALTER TABLE "member" ALTER COLUMN "role" SET DEFAULT 'driver';--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "user_type";--> statement-breakpoint
DROP TYPE "public"."user_type";