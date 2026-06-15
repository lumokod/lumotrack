CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY NOT NULL,
	"shipment_id" uuid NOT NULL,
	"organization_id" text NOT NULL,
	"driver_user_id" text,
	"rating" smallint NOT NULL,
	"comment" varchar(1000),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reviews_shipment_id_unique" UNIQUE("shipment_id")
);
--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_driver_user_id_user_id_fk" FOREIGN KEY ("driver_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "reviews_org_idx" ON "reviews" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "reviews_driver_idx" ON "reviews" USING btree ("driver_user_id");