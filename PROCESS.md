# Process overview

## How I got here

**Choosing the slice.** I rarely book rooms, so before choosing I researched
LibCal from its public booking page and FAQ, with an AI assistant's help: four
separate per-library pages, a login required to see availability, room details
behind a per-room "Info" button, and the 2-hour / 2-week rules stated only as
text. I asked for a plan first, with a decision on every existing test.

**Reviewing the plan.** I used a second Claude session (Claude in Cowork) as a
reviewer. It flagged seven changes, which I adopted and relayed as a rejection
of the first plan: exact error codes in each test, "today" computed in
Sydney time in the tests plus a past-slot rule, the SQLite foreign-key pragma,
email normalisation, `db.transaction()` around the daily cap, a buildable
commit order, and a cancellation test.

> Tests must fail/pass for the RIGHT reason.

I approved the revised plan on three conditions: verify on the live URL that a
booking survives a reload and a redeploy, never use `--no-verify`, and list
the known limitations in the README.

**Building.** Red tests first
([`89eca2a`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-baizhenh884-dev/commit/89eca2a)),
then schema, rules and grid in one buildable commit
([`6e7d66b`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-baizhenh884-dev/commit/6e7d66b)),
then the two pages
([`6e7d66b...83c00dd`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-baizhenh884-dev/compare/6e7d66b...83c00dd)).
Live, a booking survived a reload and a redeploy.

**Testing the live site.** With all 48 tests green, I used the site myself and
found an unreadable wall of "Book" links; the reviewer flagged that past slots
still looked bookable. Both fixed in
[`2d9f3dc`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-baizhenh884-dev/commit/2d9f3dc).
I also had to retype my email on My bookings; rather than add a login (out of
scope), I asked for a redirect plus a remembered email
([`f8cc16a`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-baizhenh884-dev/commit/f8cc16a)).

**Harness.** I built `CLAUDE.md` from my ass2 harness. Its conflict rule made
the agent flag that "every commit passes `pnpm check`" clashed with "tests red
first"; I resolved it with a red-test exception
([`71a7fc1`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-baizhenh884-dev/commit/71a7fc1)).
