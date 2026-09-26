# Process overview

## What I built

A cross-library ANU Library room booking prototype: one filterable grid across
four libraries, a booking form, and an email-based "my bookings" page with
cancellation, with double-booking, daily-hour-cap, booking-window and
past-slot rules enforced server- and database-side. `README.md` has the full
account of what it is and what good means here; this is how I got there.

## How I got here

I planned the whole slice with the agent before writing anything: which rules
needed DB-level enforcement (the double-booking guard is a unique index, not
just an application check) versus application-level (the daily cap, the
booking window, past-slot rejection), what the spec test scenarios should be,
and the commit sequence to get there without ever leaving the tree
mid-migration. The plan (kept at
[`.claude/plans/zesty-tickling-river.md`](.claude/plans/zesty-tickling-river.md)
in my Claude Code data, not this repo) settled on dropping the starter's SSE
plumbing entirely — the spec only needed reload-persistence, not live cross-tab
sync — and on writing the booking-rule tests red, against the still-guestbook
app, before any implementation existed.

I approved that plan with three explicit conditions, quoted here because they
shaped every commit after:

> Approved — go ahead in auto mode, with three additions: 1. Add a deploy step
> after commit 4: `flyctl deploy --remote-only --ha=false -a
> comp4020-crit7-baizhenh884-dev`, then verify on the live URL that a booking
> survives a reload (and a redeploy). Tell me the result. 2. Never use
> `--no-verify`. If a pre-commit hook blocks the intentionally-red commit 1,
> stop and tell me instead of working around it. 3. In the README, list "anyone
> who knows an email can view/cancel-attempt its bookings (no SSO)" as a known
> limitation, along with the illustrative room names.

**Red first.** [`89eca2a`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-baizhenh884-dev/commit/89eca2a)
added `spec/bookings.test.ts` — seven scenarios (persistence, double-booking,
the 2-hour cap and its case-insensitivity, the 14-day window and its boundary,
past-slot rejection, cancellation with the wrong vs. right email) — against
the untouched guestbook app, so it failed for the right reason: the routes it
needed didn't exist yet, not a typo. I checked this before committing rather
than assuming it.

**The replacement, in one commit.** [`6e7d66b`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-baizhenh884-dev/commit/6e7d66b)
swapped the schema (drops `messages`, adds `rooms` and `bookings` with a unique
index on room/date/slot), rewrote `lib/db.ts` and added `lib/bookings.ts` with
the actual rules, added the three API routes, deleted the guestbook's routes
and SSE plumbing, and rewrote `index.astro` as the availability grid — all in
one commit, because nothing in between builds (the grid can't exist without
the query functions it calls). `pnpm db:generate`'s interactive rename-prompt
(it asks, over a TTY I don't have, whether `rooms`/`bookings` are the dropped
`messages` table renamed) forced the migration into two separate,
unambiguous runs — a pure drop, then a pure create — rather than one
ambiguous diff.

Two of the seven new tests failed once this was all in place, and both had the
same shape: asserting a booking link was *present* on the grid before a
booking, or reappeared after a cancellation. Booting the built server by hand
and curling the grid showed why — Astro correctly HTML-escapes `&` to `&amp;`
in the rendered `href`, and my test helper was building a raw-`&` string that
could never match. That was a bug in the test, not the app; fixed in the same
commit rather than "fixing" working code to match a wrong assertion.

**The two human-facing pages**, each its own commit once the API beneath them
already worked:
[`f62c377`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-baizhenh884-dev/commit/f62c377)
(`/book`, with a "pick a slot from the grid" fallback when reached with no
target) and
[`83c00dd`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-baizhenh884-dev/commit/83c00dd)
(`/bookings`, email lookup plus cancel forms). I clicked through both by hand
against a locally-booted build after each commit — book a slot, confirm the
grid cell loses its link, cancel it, confirm the link comes back — rather than
trusting the spec tests alone to prove the human-facing flow made sense.

**Deploy and verify**, per condition 1 above: `flyctl deploy --remote-only
--ha=false -a comp4020-crit7-baizhenh884-dev`, then against the live URL I
booked a slot, confirmed the grid no longer offered it on a fresh request,
redeployed, and confirmed the same booking was still there afterwards — the
SQLite file lives on the app's Fly volume, untouched by a redeploy of the
image sitting on top of it.

**README last:**
[`ffde4a7`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-baizhenh884-dev/commit/ffde4a7)
rewrote it to explain what good means here (the rules above, DB- and
server-enforced, tested over HTTP rather than by importing `src/lib`
directly — proving the deployed contract, not just the implementation) and to
name the two limitations from condition 3: the room list is illustrative, not
the real ANU room list, and there's no real authentication behind
`/bookings` — knowing a booking's email is enough to look it up and attempt to
cancel it.

Throughout: `pnpm check` after every commit from the second one on (must be
green — 32 tests after commit 2, growing to 48 once both new pages added their
own invariants coverage), and no `--no-verify` at any point, per condition 2 —
the pre-commit hook never actually fired on any of this work.
