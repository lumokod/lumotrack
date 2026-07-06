import { Redis } from "ioredis";
import { env } from "@/core/env";
import type {
  DriverLocationUpdate,
  TrackingHandler,
  TrackingMessage,
} from "./messages";

// Refreshed on every ping — only expires when pings stop.
const LAST_KNOWN_TTL_SECONDS = 60;

// Subscriber-mode Redis connections can't run regular commands, so pub/sub gets its own.
const redis = new Redis(env.REDIS_URL);
const redisSubscriber = new Redis(env.REDIS_URL);

const channelFor = (driverId: string) => `tracking:driver:${driverId}`;
const lastKnownKeyFor = (driverId: string) =>
  `tracking:driver:${driverId}:last`;

const channelHandlers = new Map<string, Set<TrackingHandler>>();

redisSubscriber.on("message", (channel: string, payload: string) => {
  const handlers = channelHandlers.get(channel);
  if (!handlers) return;
  const message = JSON.parse(payload) as TrackingMessage;
  for (const handler of handlers) handler(message);
});

export async function publishTracking(message: TrackingMessage) {
  const payload = JSON.stringify(message);
  if (message.type === "location") {
    await redis.set(
      lastKnownKeyFor(message.driverId),
      payload,
      "EX",
      LAST_KNOWN_TTL_SECONDS,
    );
  } else {
    // Driver went offline — stop serving their stale position to new watchers.
    await redis.del(lastKnownKeyFor(message.driverId));
  }
  await redis.publish(channelFor(message.driverId), payload);
}

export async function getLastKnownLocation(driverId: string) {
  const payload = await redis.get(lastKnownKeyFor(driverId));
  return payload ? (JSON.parse(payload) as DriverLocationUpdate) : null;
}

export async function subscribeToDriver(
  driverId: string,
  handler: TrackingHandler,
) {
  const channel = channelFor(driverId);
  let handlers = channelHandlers.get(channel);
  if (!handlers) {
    handlers = new Set();
    channelHandlers.set(channel, handlers);
    await redisSubscriber.subscribe(channel);
  }
  handlers.add(handler);
}

export async function unsubscribeFromDriver(
  driverId: string,
  handler: TrackingHandler,
) {
  const channel = channelFor(driverId);
  const handlers = channelHandlers.get(channel);
  if (!handlers) return;
  handlers.delete(handler);
  if (handlers.size === 0) {
    channelHandlers.delete(channel);
    await redisSubscriber.unsubscribe(channel);
  }
}
