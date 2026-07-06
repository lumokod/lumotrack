export type DriverLocationUpdate = {
  type: "location";
  driverId: string;
  latitude: number;
  longitude: number;
  timestamp: string;
};

export type DriverOffline = {
  type: "offline";
  driverId: string;
  timestamp: string;
};

export type TrackingMessage = DriverLocationUpdate | DriverOffline;

export type TrackingHandler = (message: TrackingMessage) => void;
