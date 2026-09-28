# Process overview

## How I got here

**Choosing the slice.** Rarely booking rooms myself, I first researched
LibCal's public booking page and FAQ with an AI assistant's help: four separate
library pages, availability behind a login, and the 2-hour / 2-week rules
stated only as text. I asked for a plan first, with a decision on every
existing test.

**Reviewing the plan.** A second Claude session (Claude in Cowork) reviewed the
first plan and flagged seven changes, which I adopted and relayed as a
rejection: exact error codes in each test, Sydney-time "today" in the tests
plus a past-slot rule, the foreign-key pragma, email normalisation,
`db.transaction()` around the daily cap, a buildable commit order, and a
cancellation test.

> Tests must fail/pass for the RIGHT reason.

I approved the revision on three conditions: verify persistence on the live
URL, never use `--no-verify`, and list known limitations in the README.

**Building.** Red tests first
([`89eca2a`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-baizhenh884-dev/commit/89eca2a)),
then schema, rules and grid
([`6e7d66b`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-baizhenh884-dev/commit/6e7d66b)),
then the two pages
([`6e7d66b...83c00dd`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-baizhenh884-dev/compare/6e7d66b...83c00dd)).
Live, a booking survived a reload and a redeploy.

**Testing the live site.** With 48 green tests, I used the site myself and
found an unreadable wall of "Book" links; the reviewer flagged past slots that
still looked bookable. Both fixed in
[`2d9f3dc`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-baizhenh884-dev/commit/2d9f3dc).
I also had to retype my email on My bookings; instead of a login (out of scope)
I asked for a redirect plus a remembered email
([`f8cc16a`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-baizhenh884-dev/commit/f8cc16a)).

**Harness and audit.** I built `CLAUDE.md` from my ass2 harness; its conflict
rule made the agent flag that "every commit passes `pnpm check`" clashed with
"tests red first", which I resolved with a red-test exception
([`71a7fc1`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-baizhenh884-dev/commit/71a7fc1)).
I then had the existing work audited against it. It found that unvalidated
date formats let a variant spelling of a day bypass the unique index and the
daily cap. Fixed red-first
([`ee4c2e3`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-baizhenh884-dev/commit/ee4c2e3),
[`27ef3d9`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-baizhenh884-dev/commit/27ef3d9)),
with the missing tests added
([`27ef3d9...155a779`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-baizhenh884-dev/compare/27ef3d9...155a779)).
