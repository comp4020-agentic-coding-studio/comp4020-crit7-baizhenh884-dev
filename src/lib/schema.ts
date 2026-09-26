import { sql } from "drizzle-orm";
import { int, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

// The schema is the ground truth for the database. To change it: edit here,
// run `pnpm db:generate` to turn the diff into a migration under drizzle/,
// and commit both — the migration applies automatically when the server
// boots (see src/lib/db.ts), locally and deployed. Never edit the database
// by hand: state on the deployed volume outlives every deploy, and the
// migration trail is what keeps old state and new code compatible.
export const rooms = sqliteTable("rooms", {
  id: int().primaryKey({ autoIncrement: true }),
  library: text().notNull(),
  name: text().notNull(),
  capacity: int().notNull(),
  // comma-separated tags, e.g. "whiteboard,tv"
  equipment: text().notNull(),
});

export const bookings = sqliteTable(
  "bookings",
  {
    id: int().primaryKey({ autoIncrement: true }),
    roomId: int("room_id")
      .notNull()
      .references(() => rooms.id),
    date: text().notNull(), // YYYY-MM-DD, Australia/Sydney
    slot: int().notNull(), // hour the slot starts, e.g. 9 = 09:00-10:00
    name: text().notNull(),
    email: text().notNull(), // stored trimmed + lowercased
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  // The double-booking guard: the DB itself refuses a second row for the
  // same room, date and slot, so the rule holds even under concurrent
  // requests — no application-level check can race around it.
  (table) => [uniqueIndex("bookings_room_date_slot_unique").on(table.roomId, table.date, table.slot)],
);

export type Room = typeof rooms.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
