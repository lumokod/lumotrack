import { shipmentStatusEnum } from "@/db/schema";

export type ShipmentStatus = (typeof shipmentStatusEnum.enumValues)[number];

export type ShipmentCreate = {
  longitude: number;
  latitude: number;
  content: string;
  weight: number;
  estimatedDelivery: Date;
};

export type ShipmentUpdate = {
  longitude?: number;
  latitude?: number;
  content?: string;
  weight?: number;
  estimatedDelivery?: Date;
  status?: ShipmentStatus;
};
