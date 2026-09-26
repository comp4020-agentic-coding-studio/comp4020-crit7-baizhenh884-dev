import { beforeAll, describe, expect, inject, it } from "vitest";

// HTTP-only, in the same style as the old spec/guestbook.test.ts: these hit
// the running server exactly as a browser would, never importing src/lib —
// that's what proves the *deployed contract*, not just the implementation,
// and it's why "today" and "now" below are computed independently of the
// server rather than imported from it.
const baseUrl = inject("baseUrl");

const TIMEZONE = "Australia/Sydney";
const dateFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit" });
const hourFmt = new Intl.DateTimeFormat("en-US", { timeZone: TIMEZONE, hour: "numeric", hourCycle: "h23" });

function sydneyToday(): string {
  return dateFmt.format(new Date());
}

function sydneyHourNow(): number {
  return Number(hourFmt.format(new Date()));
}

// Adds whole days to a YYYY-MM-DD Sydney calendar date. Represents the date
// at UTC noon (always mid-to-late evening in Sydney, never near a local
// midnight) before shifting, so the result is correct even across a Sydney
// DST transition — plain "add N*86400000 ms to now" arithmetic can't promise
// that.
function sydneyDatePlusDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const noon = new Date(Date.UTC(y, m - 1, d, 12));
  noon.setUTCDate(noon.getUTCDate() + days);
  return dateFmt.format(noon);
}

const uniqueEmail = () => `probe-${process.hrtime.bigint()}@anu.edu.au`;

function post(path: string, body: URLSearchParams): Promise<Response> {
  return fetch(new URL(path, baseUrl), {
    method: "POST",
    // Astro checks the Origin header on same-origin form POSTs as CSRF
    // protection; a bare fetch doesn't send one, so it's set explicitly.
    headers: { origin: baseUrl },
    body,
    redirect: "manual",
  });
}

function bookingParams(opts: { roomId: number; date: string; slot: number; email: string; name?: string }): URLSearchParams {
  return new URLSearchParams({
    roomId: String(opts.roomId),
    date: opts.date,
    slot: String(opts.slot),
    name: opts.name ?? "Spec Probe",
    email: opts.email,
  });
}

function locationParam(res: Response, name: string): string | null {
  const location = res.headers.get("location");
  if (!location) return null;
  return new URL(location, baseUrl).searchParams.get(name);
}

function expectBookingSucceeds(res: Response): void {
  expect(res.status).toBe(303);
  expect(locationParam(res, "error")).toBeNull();
}

function expectBookingFails(res: Response, code: string): void {
  expect(res.status).toBe(303);
  expect(locationParam(res, "error")).toBe(code);
}

// Astro (correctly) HTML-escapes "&" to "&amp;" inside an href attribute, so
// that's what the served page actually contains.
function bookLink(roomId: number, date: string, slot: number): string {
  return `/book?room=${roomId}&amp;date=${date}&amp;slot=${slot}`;
}

async function gridHasLink(date: string, link: string): Promise<boolean> {
  const res = await fetch(new URL(`/?date=${date}`, baseUrl));
  const html = await res.text();
  return html.includes(link);
}

type Room = { id: number; library: string; name: string; capacity: number; equipment: string };
type BookingRecord = { id: number; roomId: number; date: string; slot: number; email: string };

describe("bookings", () => {
  let rooms: Room[];

  beforeAll(async () => {
    const res = await fetch(new URL("/api/rooms", baseUrl));
    rooms = await res.json();
    expect(rooms.length, "seed data should include several illustrative rooms").toBeGreaterThanOrEqual(11);
  });

  // Each scenario below uses its own room (and its own slots within it) so
  // that no two tests can collide on the same (room, date, slot) — the
  // daily-cap test can't pass because of a slot_taken error from another
  // test, for example.

  describe("persistence", () => {
    it("a booking survives a reload of the grid", async () => {
      const room = rooms[0];
      const date = sydneyDatePlusDays(sydneyToday(), 1);
      const slot = 9;
      const link = bookLink(room.id, date, slot);

      expect(await gridHasLink(date, link)).toBe(true);

      const res = await post("/api/bookings", bookingParams({ roomId: room.id, date, slot, email: uniqueEmail() }));
      expectBookingSucceeds(res);

      expect(await gridHasLink(date, link)).toBe(false);
    });
  });

  describe("double booking", () => {
    it("rejects a second booking for the same room, date and slot", async () => {
      const room = rooms[1];
      const date = sydneyDatePlusDays(sydneyToday(), 1);
      const slot = 10;

      const first = await post("/api/bookings", bookingParams({ roomId: room.id, date, slot, email: uniqueEmail() }));
      expectBookingSucceeds(first);

      const second = await post("/api/bookings", bookingParams({ roomId: room.id, date, slot, email: uniqueEmail() }));
      expectBookingFails(second, "slot_taken");
    });
  });

  describe("daily cap", () => {
    it("allows 2 hours per email per day and rejects a 3rd", async () => {
      const room = rooms[2];
      const date = sydneyDatePlusDays(sydneyToday(), 1);
      const email = uniqueEmail();

      expectBookingSucceeds(await post("/api/bookings", bookingParams({ roomId: room.id, date, slot: 11, email })));
      expectBookingSucceeds(await post("/api/bookings", bookingParams({ roomId: room.id, date, slot: 12, email })));
      expectBookingFails(await post("/api/bookings", bookingParams({ roomId: room.id, date, slot: 13, email })), "daily_cap");
    });

    it("ignores email case when counting the cap", async () => {
      const room = rooms[3];
      const date = sydneyDatePlusDays(sydneyToday(), 1);
      const email = uniqueEmail();
      const mixedCase = email.replace(/^./, (c) => c.toUpperCase());
      const upperCase = email.toUpperCase();

      expectBookingSucceeds(await post("/api/bookings", bookingParams({ roomId: room.id, date, slot: 9, email: mixedCase })));
      expectBookingSucceeds(await post("/api/bookings", bookingParams({ roomId: room.id, date, slot: 10, email })));
      expectBookingFails(await post("/api/bookings", bookingParams({ roomId: room.id, date, slot: 11, email: upperCase })), "daily_cap");
    });
  });

  describe("booking window", () => {
    it("rejects a date 15 days out and accepts the 14-day boundary", async () => {
      const room = rooms[4];
      const today = sydneyToday();

      const tooFar = await post(
        "/api/bookings",
        bookingParams({ roomId: room.id, date: sydneyDatePlusDays(today, 15), slot: 9, email: uniqueEmail() }),
      );
      expectBookingFails(tooFar, "out_of_window");

      const boundary = await post(
        "/api/bookings",
        bookingParams({ roomId: room.id, date: sydneyDatePlusDays(today, 14), slot: 9, email: uniqueEmail() }),
      );
      expectBookingSucceeds(boundary);
    });
  });

  describe("malformed dates", () => {
    // A date that isn't exactly a real YYYY-MM-DD would get its own key in the
    // unique index and the daily cap, so it must be rejected outright.
    it.each([
      ["a trailing space", () => `${sydneyDatePlusDays(sydneyToday(), 1)} `],
      ['an "x" suffix', () => `${sydneyDatePlusDays(sydneyToday(), 1)}x`],
      ["an impossible calendar date", () => "2026-02-30"],
      ["day 00 of the month the window ends in", () => `${sydneyDatePlusDays(sydneyToday(), 14).slice(0, 7)}-00`],
    ])("rejects %s as invalid_date", async (_label, date) => {
      const res = await post("/api/bookings", bookingParams({ roomId: rooms[10].id, date: date(), slot: 9, email: uniqueEmail() }));
      expectBookingFails(res, "invalid_date");
    });
  });

  describe("past slots", () => {
    it("rejects a slot that has already started today, in Sydney time", async () => {
      const room = rooms[5];
      const date = sydneyToday();
      const slot = sydneyHourNow();

      const res = await post("/api/bookings", bookingParams({ roomId: room.id, date, slot, email: uniqueEmail() }));
      expectBookingFails(res, "past_slot");
    });
  });

  describe("cancellation", () => {
    it("persists once cancelled, and requires the booking's own email", async () => {
      const room = rooms[6];
      const date = sydneyDatePlusDays(sydneyToday(), 1);
      const slot = 9;
      const email = uniqueEmail();
      const link = bookLink(room.id, date, slot);

      expectBookingSucceeds(await post("/api/bookings", bookingParams({ roomId: room.id, date, slot, email })));
      expect(await gridHasLink(date, link)).toBe(false);

      const listRes = await fetch(new URL(`/api/bookings?email=${encodeURIComponent(email)}`, baseUrl));
      const mine: BookingRecord[] = await listRes.json();
      const booking = mine.find((b) => b.roomId === room.id && b.date === date && b.slot === slot);
      expect(booking, "the created booking should be listed for its own email").toBeTruthy();

      const wrongCancel = await post("/api/bookings/cancel", new URLSearchParams({ id: String(booking!.id), email: uniqueEmail() }));
      expect(wrongCancel.status).toBe(303);
      expect(locationParam(wrongCancel, "error")).toBe("email_mismatch");
      expect(await gridHasLink(date, link)).toBe(false);

      const rightCancel = await post("/api/bookings/cancel", new URLSearchParams({ id: String(booking!.id), email }));
      expect(rightCancel.status).toBe(303);
      expect(locationParam(rightCancel, "error")).toBeNull();
      expect(await gridHasLink(date, link)).toBe(true);

      const afterRes = await fetch(new URL(`/api/bookings?email=${encodeURIComponent(email)}`, baseUrl));
      const after: BookingRecord[] = await afterRes.json();
      expect(after.some((b) => b.id === booking!.id)).toBe(false);
    });
  });
});
