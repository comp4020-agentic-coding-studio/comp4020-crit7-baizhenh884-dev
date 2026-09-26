# Crit 7 reflection

## What was the breakthrough that moved the work forward?

I rarely book library rooms, so I chose this after researching LibCal's
public pages, where the booking rules exist only as text.

The breakthrough was reviewing the agent's first plan instead of just
approving it. A second Claude session (Claude in Cowork) acted as reviewer
and flagged seven changes. The most important: some tests could have passed
for the wrong reason. The daily-cap test could go green because of a
double-booking error, and the plan didn't specify how the tests would compute
"today", so they could have used the machine's UTC clock and failed depending
on the time of day. I decided which changes to adopt and asked for all seven
before any code was written.

## What did this work change about who I want to be as a software developer?

Green tests aren't the same as a good product. With 48 tests passing, I used
the live site and found an unreadable wall of "Book" links and a flow that
made me retype my email; the reviewer also caught past slots that still
looked bookable. The tests proved the rules; only using the site showed the
problems.

In earlier crits I approved work in stages and checked in between. This time
I approved the whole plan in auto mode, and it ran every commit in about 47
minutes without stopping. The plan was solid enough that it worked, but I
only reviewed the result at the end, which is why the usability problems
surfaced late. It confirmed why I normally work in stages; next time I'll
write checkpoints into the approval itself (e.g. "stop after the schema
commit"), not just rely on remembering to pause.

Next, I'd add real ANU sign-in so bookings aren't looked up by email alone,
and show each library's real opening hours.
