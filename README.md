# ANU Library room booking

A cross-library group study room booking prototype. Right now, checking room
availability at ANU Library means visiting four separate LibCal pages (one per
library); you have to log in with ANU SSO before you can see availability, and
room details sit behind a per-room "Info" button. The booking rules —
LibCal's page says you can book "up to two hours a day" and "up to two weeks
in advance" — exist only as text on the page: nothing tells you a booking
would break them until you try. This app puts every room from
all four libraries — Chifley, Hancock, Menzies, Law — in one filterable grid,
greys out anything you can't book, lets you book a free slot with just a name
and email, and takes you straight to your bookings afterwards, where you can
cancel. No login is required to browse or to book.

## What good looks like here

Good, here, means the booking rules are enforced by the server and the
database — not just by the UI — and that they hold under HTTP requests made
directly against the API, not only through the rendered forms:

- **No double booking.** A room/date/hour combination can be booked once; the
  database's own unique index is the source of truth, not just an
  application-level check, so it holds even under two near-simultaneous
  requests.
- **A 2-hour daily cap per person**, taken from LibCal's own rule. Counted per
  (trimmed, lowercased) email per Sydney calendar day, so `Test@anu.edu.au` and
  `test@ANU.edu.au` share one cap, and the count-then-insert is one atomic
  transaction so two near-simultaneous bookings can't both slip past the limit.
- **A 14-day booking window**, LibCal's "two weeks in advance". Only today
  through 14 days ahead is bookable, computed against `Australia/Sydney`, not
  the server's or your browser's own clock — that matters because this runs on
  a UTC container.
- **No booking a slot that's already started**, again computed in Sydney time.
- **Clear, stable error codes** (`slot_taken`, `daily_cap`, `out_of_window`,
  `past_slot`, `email_mismatch`, ...) rather than one generic failure message,
  so a rejected booking tells you which rule stopped it.

These rules, and the tests that hold them to it end-to-end over HTTP (booking,
rejecting a double-booking, rejecting a third hour, rejecting an out-of-window
or already-started slot, and cancelling), live in `src/lib/bookings.ts` and
`spec/bookings.test.ts`. The invariants in `spec/invariants.test.ts` (one
heading, a nav landmark, a real title, an accessibility floor) are the
supplied baseline and apply to every page, including the new ones.

What I chose not to build: no SSE/live updates across tabs (the spec only
needed reload-persistence, not multi-client sync); no admin view of all
bookings; no email confirmation. All out of scope for a one-week prototype.

## Known limitations

- **The room list is illustrative, not the real ANU room list.** Twelve rooms
  across the four libraries, with made-up names, capacities and equipment
  tags, seeded for demonstration purposes only.
- **There is no real authentication.** Anyone who knows (or guesses) an email
  address can look up and attempt to cancel that email's bookings on
  `/bookings` — there's no SSO, password, or confirmation link tying an email
  to the person who actually owns it. A real deployment would need to fix
  this before handling genuine bookings.
- **The remembered email is a convenience, not a login.** After you book or
  look up your bookings, your email is kept in a cookie for 30 days so you
  don't have to retype it, and "Not you?" clears it. It proves nothing about
  who you are.
- **Opening hours are simplified to 08:00–22:00 for every library.** In
  reality Chifley and Hancock are open 24 hours; one shared set of hourly
  slots kept the grid simple for this prototype.
