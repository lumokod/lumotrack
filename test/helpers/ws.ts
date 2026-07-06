import type { WSEvents } from "hono/ws";
import app from "@/core/app";

// Fake Bun server captures the WS event listeners for direct invocation — see code-standards.md → Tests.
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
  return { sent, socket: socket as never };
}
