import { JSDOM } from "jsdom";
import { beforeAll, describe, expect, inject, it } from "vitest";

// There's no login, so after booking the app sends you to your own bookings
// and remembers your email in a cookie. HTTP-only, like spec/bookings.test.ts;
// uses rooms[7] onwards so it never collides with that file's slots.
const baseUrl = inject("baseUrl");

const COOKIE = "booking_email";
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const dateFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Australia/Sydney",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function sydneyDatePlusDays(days: number): string {
  const [y, m, d] = dateFmt.format(new Date()).split("-").map(Number);
  const noon = new Date(Date.UTC(y, m - 1, d, 12));
  noon.setUTCDate(noon.getUTCDate() + days);
  return dateFmt.format(noon);
}

const uniqueEmail = () => `probe-${process.hrtime.bigint()}@anu.edu.au`;

type Room = { id: number; library: string; name: string };

function post(path: string, body: Record<string, string>): Promise<Response> {
  return fetch(new URL(path, baseUrl), {
    method: "POST",
    headers: { origin: baseUrl },
    body: new URLSearchParams(body),
    redirect: "manual",
  });
}

function book(room: Room, date: string, slot: number, email: string): Promise<Response> {
  return post("/api/bookings", { roomId: String(room.id), date, slot: String(slot), name: "Spec Probe", email });
}

function emailCookie(res: Response): string | undefined {
  return res.headers.getSetCookie().find((c) => c.startsWith(`${COOKIE}=`));
}

async function page(path: string, email?: string): Promise<Document> {
  const headers = email ? { cookie: `${COOKIE}=${encodeURIComponent(email)}` } : undefined;
  const res = await fetch(new URL(path, baseUrl), { headers });
  return new JSDOM(await res.text()).window.document;
}

describe("remembering the email", () => {
  let rooms: Room[];

  beforeAll(async () => {
    rooms = await (await fetch(new URL("/api/rooms", baseUrl))).json();
    expect(rooms.length).toBeGreaterThanOrEqual(10);
  });

  it("redirects a successful booking to that email's bookings and remembers the email", async () => {
    const email = uniqueEmail();
    const res = await book(rooms[7], sydneyDatePlusDays(2), 10, email.toUpperCase());

    expect(res.status).toBe(303);
    const location = new URL(res.headers.get("location") ?? "", baseUrl);
    expect(location.pathname).toBe("/bookings");
    expect(location.searchParams.get("email")).toBe(email);
    expect(location.searchParams.get("booked")).toMatch(/^\d+$/);

    const cookie = emailCookie(res);
    expect(cookie, "a successful booking sets the email cookie").toBeTruthy();
    expect(decodeURIComponent(cookie?.split(";")[0].slice(COOKIE.length + 1) ?? "")).toBe(email);
    expect(cookie).toMatch(/SameSite=Lax/i);
    expect(cookie).toMatch(/Max-Age=2592000/i);
    expect(cookie).toMatch(/Path=\//i);
  });

  it("shows what was just booked on the page it redirects to", async () => {
    const room = rooms[8];
    const date = sydneyDatePlusDays(2);
    const res = await book(room, date, 10, uniqueEmail());
    const doc = await page(res.headers.get("location") ?? "");

    const [, m, d] = date.split("-").map(Number);
    const short = room.name.replace(`${room.library} `, "");
    expect(doc.querySelector('[role="status"]')?.textContent).toBe(`Booked ${short}, ${d} ${MONTHS[m - 1]} 10:00–11:00`);
  });

  it("doesn't show the success message for a booking that isn't this email's", async () => {
    const res = await book(rooms[9], sydneyDatePlusDays(2), 10, uniqueEmail());
    const booked = new URL(res.headers.get("location") ?? "", baseUrl).searchParams.get("booked");

    const doc = await page(`/bookings?email=${encodeURIComponent(uniqueEmail())}&booked=${booked}`);
    expect(doc.querySelector('[role="status"]')).toBeNull();
  });

  it("neither redirects to /bookings nor remembers the email when a booking fails", async () => {
    const room = rooms[9];
    const date = sydneyDatePlusDays(2);
    expect((await book(room, date, 11, uniqueEmail())).status).toBe(303);

    const res = await book(room, date, 11, uniqueEmail());
    expect(new URL(res.headers.get("location") ?? "", baseUrl).pathname).toBe("/book");
    expect(emailCookie(res)).toBeUndefined();
  });

  it("prefills the remembered email on /book and /bookings, and points My bookings at it", async () => {
    const email = uniqueEmail();
    const target = `/book?room=${rooms[7].id}&date=${sydneyDatePlusDays(3)}&slot=9`;

    for (const path of [target, "/bookings"]) {
      const doc = await page(path, email);
      expect(doc.querySelector<HTMLInputElement>('input[name="email"]')?.value, path).toBe(email);
      const navLink = [...doc.querySelectorAll("nav a")].find((a) => a.textContent === "My bookings");
      expect(navLink?.getAttribute("href"), path).toBe(`/bookings?email=${encodeURIComponent(email)}`);
    }
  });

  it("leaves /book and the nav alone when no email is remembered", async () => {
    const doc = await page(`/book?room=${rooms[7].id}&date=${sydneyDatePlusDays(3)}&slot=9`);
    expect(doc.querySelector<HTMLInputElement>('input[name="email"]')?.value).toBe("");
    const navLink = [...doc.querySelectorAll("nav a")].find((a) => a.textContent === "My bookings");
    expect(navLink?.getAttribute("href")).toBe("/bookings");
  });

  it("forgets the email and returns to a same-site page only", async () => {
    const back = `/book?room=${rooms[7].id}&date=${sydneyDatePlusDays(3)}&slot=9`;
    const res = await post("/api/email/forget", { next: back });
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe(back);
    const cookie = emailCookie(res);
    expect(cookie, "forgetting clears the cookie").toBeTruthy();
    expect(cookie).toMatch(/Max-Age=0|Expires=Thu, 01 Jan 1970/i);

    const offsite = await post("/api/email/forget", { next: "//evil.example/" });
    expect(offsite.headers.get("location")).toBe("/bookings");
  });
});
