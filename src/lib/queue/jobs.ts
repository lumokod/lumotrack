import type { EventStatus } from "@/features/events/events.types";

export type NotificationJobName = "shipment-update" | "verification" | "sms-shipment-update";

export type NotificationJobData =
  | { type: "shipment-update"; email: string; shipmentContent: string; eventStatus: EventStatus }
  | { type: "verification"; email: string; url: string }
  | { type: "sms-shipment-update"; phone: string; shipmentContent: string; eventStatus: EventStatus };
