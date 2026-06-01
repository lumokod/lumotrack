ALTER TABLE "events" RENAME COLUMN "location" TO "address";--> statement-breakpoint
DROP INDEX "events_location_spatial_idx";