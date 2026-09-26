import type { APIRoute } from "astro";
import { listRooms } from "../../lib/bookings";

// Plain JSON room list — the grid renders from listRooms() directly, so
// this exists for clients (and specs) that need the room list over HTTP
// without a browser, e.g. to discover a seeded room's id.
export const GET: APIRoute = () => {
  return new Response(JSON.stringify(listRooms()), {
    headers: { "content-type": "application/json" },
  });
};
