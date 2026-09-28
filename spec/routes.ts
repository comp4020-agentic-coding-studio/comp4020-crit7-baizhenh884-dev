// The routes the invariants run against. When you add a page, add its route
// here, or the invariants stop covering it.

// Tomorrow in Australia/Sydney, so the filled-in routes stay bookable whenever
// the suite runs.
function sydneyTomorrow(): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Sydney",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const [y, m, d] = fmt.format(new Date()).split("-").map(Number);
  return fmt.format(new Date(Date.UTC(y, m - 1, d + 1, 12)));
}

// global-setup.ts makes this booking before any test runs. It's the first
// write to a fresh database, so its id is 1. Room 12 and 21:00 are used by no
// other test.
export const FIXTURE_BOOKING = {
  roomId: 12,
  date: sydneyTomorrow(),
  slot: 21,
  email: "invariants@anu.edu.au",
  id: 1,
};

export const ROUTES = [
  "/",
  "/readme/",
  "/book",
  `/book?room=1&date=${FIXTURE_BOOKING.date}&slot=9`,
  "/bookings",
  `/bookings?email=${encodeURIComponent(FIXTURE_BOOKING.email)}&booked=${FIXTURE_BOOKING.id}`,
];
