# Harness

The course website publishes this deliverable's brief and spec; `fly.toml`, the
`Dockerfile`, the CI workflow and `spec/README.md` say what the starter fixes.
Read them before you plan or build.

## How to work in here

- **Plan first.** No code until I approve the plan. The plan lists what happens
  to every existing test: kept, replaced or removed, and why. Never delete a
  test silently.
- **Tests red first.** Write the spec tests before the implementation and check
  they fail for the right reason: the feature is missing, not a typo. Assert the
  exact error code, not just "it failed", and give each test its own data
  (room, date, slot, email) so no test can pass because of another test's
  error.
- **Every commit builds and passes `pnpm check`.** The one exception is a
  red-test commit: it may stand alone only if it builds and typechecks, and the
  only failures are the new tests failing because the feature doesn't exist yet.
- **Never use `--no-verify`.** If a hook blocks a commit, stop and tell me.
  Don't work around it.
- **One logical change per commit**, so each one can be cited on its own in
  `PROCESS.md`.
- **Don't commit `README.md`, `PROCESS.md` or `reflections/` changes without
  showing me first.** Edit them, print them, and wait for my OK.
- **Deploy and check the live site.** Deploy with
  `flyctl deploy --remote-only --ha=false -a comp4020-crit7-baizhenh884-dev`,
  then verify the change on the live URL, including by using it by hand. Green
  tests prove the rules, not that the site is usable.
- Open pages in a browser and look at them. The rendered page is the truth;
  your mental model of it isn't.
- When a check fails, read its output before you change anything. If a test
  looks wrong, prove it against the running app before "fixing" the code to
  match it.
- Before building on something that earlier work supposedly created, confirm
  it exists by citing the file and line. A plan saying it exists is not
  evidence that it does.
- Don't replace judgement with a proxy: no keyword checks and no fields added
  only so that something can be tested.

## Project contract: ANU Library room booking

- **Stack:** Astro (server output) + Drizzle + better-sqlite3, with SQLite on
  the Fly volume (`DATABASE_PATH`). Change `src/lib/schema.ts`, then run
  `pnpm db:generate`. Migrations apply at boot. drizzle-kit needs a TTY to ask
  about renames, so a schema change that both drops and adds tables is
  generated as two migrations: drop first, then create.
- **Rules live on the server and in the database, not only in the UI.** No
  double booking is enforced by the unique index on (room, date, slot);
  foreign keys are on. The limits are 2 hours per email per day (email
  trimmed and lowercased, with count and insert in one `db.transaction()`),
  today to 14 days ahead, and no slot that has already started. The UI may
  mirror these rules, but must never be the only place they are enforced.
- **All dates and times the rules or users see are Australia/Sydney**,
  computed with `Intl.DateTimeFormat`, never the machine's clock. Fly and CI
  run in UTC.
- **Error codes are the contract:** `missing_fields`, `invalid_date`,
  `out_of_window`, `past_slot`, `invalid_slot`, `unknown_room`, `daily_cap`,
  `slot_taken`, `email_mismatch`, `not_found`. They're returned as
  `?error=<code>`, tested by code, and shown to people through
  `ERROR_MESSAGES`.
- **There is no login.** The remembered-email cookie only saves retyping. Don't
  treat it as identity, and don't add authentication without asking.

## Harness maintenance protocol

When we hit a repeated correction, a failed test, an incorrect assumption, an
issue caught in manual review, or a decision to throw out an implementation,
pause before moving on. Ask whether it reveals a reusable working rule, not
just a one-off mistake. If it does, propose either a change to a rule in this
file or a new automated check. Each proposal states three things: what
happened and where, the rule you propose, and how we'll know it's working.

When an instruction I give you rests on an assumption that conflicts with the
repository, the brief, implemented behaviour or verified source material,
don't follow it mechanically and don't quietly correct it either. Name the
conflict, cite the evidence (file and line where available), say what
following the instruction would actually produce, propose the smallest safer
alternative, and wait for my approval on the disputed part. A design
preference of your own is not a conflict.

Never edit this file without my approval: show the proposed diff and wait,
every time. The file can hold durable working rules and explicit, testable
project contracts, but not task lists or implementation plans. When the
harness carries into the next deliverable, review every project-specific rule:
update it, generalise it, or remove it. Commit an approved change on its own,
separate from unrelated work.
