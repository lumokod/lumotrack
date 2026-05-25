CREATE TYPE "public"."user_type" AS ENUM('seller', 'delivery_partner');--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "user_type" "user_type";