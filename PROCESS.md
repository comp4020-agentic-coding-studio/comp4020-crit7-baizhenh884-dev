# Process overview

## How I got here

**Choosing the slice.** Rarely booking rooms, I researched LibCal's public
pages with an AI assistant's help: its 2-hour / 2-week rules exist only as
text, across four library pages. I asked for a plan first, with a decision on
every existing test.

**Reviewing the plan.** A second Claude session (Claude in Cowork) reviewed the
first plan and flagged seven changes, which I adopted and relayed as a
rejection: exact error codes in each test, Sydney-time "today" in the tests
plus a past-slot rule, the foreign-key pragma, email normalisation,
`db.transaction()` around the daily cap, a buildable commit order, and a
cancellation test.

> Tests must fail/pass for the RIGHT reason.

I approved the revision on three conditions: verify persistence live, never
use `--no-verify`, and list known limitations.

**Building.** Red tests first
([`89eca2a`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-baizhenh884-dev/commit/89eca2a)),
then schema, rules and grid
([`6e7d66b`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-baizhenh884-dev/commit/6e7d66b)),
then the two pages
([`6e7d66b...83c00dd`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-baizhenh884-dev/compare/6e7d66b...83c00dd)).

**Testing the live site.** With 48 green tests, I used the site myself and
found an unreadable wall of "Book" links; the reviewer flagged past slots still
looking bookable. Both fixed in
[`2d9f3dc`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-baizhenh884-dev/commit/2d9f3dc).
Having to retype my email, I asked for a remembered email rather than a
login
([`f8cc16a`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-baizhenh884-dev/commit/f8cc16a)).

**Harness and audit.** My ass2-derived `CLAUDE.md` made the agent flag that
"every commit passes `pnpm check`" clashed with "tests red first"; I added a
red-test exception
([`71a7fc1`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-baizhenh884-dev/commit/71a7fc1)).
An audit against it found unvalidated dates bypassing the unique index and
daily cap; fixed red-first
([`ee4c2e3`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-baizhenh884-dev/commit/ee4c2e3),
[`27ef3d9`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-baizhenh884-dev/commit/27ef3d9)),
with missing tests added
([`27ef3d9...155a779`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-baizhenh884-dev/compare/27ef3d9...155a779)).
Restyling the UI, I found jsdom's axe skips colour contrast, so green tests
prove nothing about it; I ran axe with it enabled in a real browser (0
violations, five pages) and made that a `CLAUDE.md` rule
([`66101d8`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-baizhenh884-dev/commit/66101d8),
[`20a0e40`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-baizhenh884-dev/commit/20a0e40)).
After shipping, CI's link crawl timed out because the day arrows made the site
infinite; I bounded them to the booking window, red-first
([`c197c80`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-baizhenh884-dev/commit/c197c80),
[`cbf9d27`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit7-baizhenh884-dev/commit/cbf9d27)), and added a rule to run the crawl locally.
