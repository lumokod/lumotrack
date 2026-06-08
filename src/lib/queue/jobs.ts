import type { EventStatus } from "@/features/events/events.types";

export type EmailJobName = "shipment-update" | "verification";

export type EmailJobData =
  | { type: "shipment-update"; email: string; shipmentContent: string; eventStatus: EventStatus }
  | { type: "verification"; email: string; url: string };
