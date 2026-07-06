import type { WSEvents } from "hono/ws";
import app from "@/core/app";

// Simulate a Bun WebSocket upgrade through the real middleware chain. Hono's
// Bun adapter reads the server from the fetch env and calls
// `server.upgrade(request, { data: { events } })`, so a fake server captures
// the WS event listeners — tests then invoke them directly, no socket needed.
export async function requestUpgrade(path: string) {
  let events: WSEvents | undefined;
  const server = {
    upgrade(_request: Request, options: { data: { events: WSEvents } }) {
      events = options.data.events;
      return true;
    },
  };

  const response = await app.request(
    path,
    { headers: { upgrade: "websocket" } },
    { server },
  );
  return { response, events };
}

/** Minimal stand-in for Hono's WSContext that records sent frames. */
export function fakeSocket() {
  const sent: string[] = [];
  const socket = {
    send(data: string) {
      sent.push(data);
    },
  };
  // Handlers only call `ws.send`, so the stand-in doesn't implement the rest.
  return { sent, socket: socket as never };
}
