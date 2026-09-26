import { and, eq } from "drizzle-orm";
import { db } from "./db";
import { type Booking, type Room, bookings, rooms } from "./schema";

export const TIMEZONE = "Australia/Sydney";
export const OPENING_HOUR = 8;
export const CLOSING_HOUR = 22; // last bookable slot starts at 21 (21:00-22:00)
export const MAX_HOURS_PER_DAY = 2;
export const MAX_DAYS_AHEAD = 14;

export class BookingError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "BookingError";
    this.code = code;
  }
}

export const ERROR_MESSAGES: Record<string, string> = {
  missing_fields: "Enter your name and ANU email.",
  out_of_window: `Rooms can only be booked from today up to ${MAX_DAYS_AHEAD} days ahead.`,
  past_slot: "That time slot has already started.",
  invalid_slot: "That isn't a bookable time slot.",
  unknown_room: "That room doesn't exist.",
  daily_cap: `You've already booked ${MAX_HOURS_PER_DAY} hours today — that's the limit per person per day.`,
  slot_taken: "Someone else just booked that slot. Pick another.",
  email_mismatch: "That booking doesn't belong to this email.",
  not_found: "That booking doesn't exist — it may already be cancelled.",
};

const dateFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit" });
const hourFmt = new Intl.DateTimeFormat("en-US", { timeZone: TIMEZONE, hour: "numeric", hourCycle: "h23" });

export function today(): string {
  return dateFmt.format(new Date());
}

export function currentSydneyHour(): number {
  return Number(hourFmt.format(new Date()));
}

// Adds whole days to a YYYY-MM-DD Sydney calendar date. Representing the
// date at UTC noon (always mid-evening in Sydney, never near a local
// midnight) before shifting keeps this correct across a Sydney DST
// transition, unlike adding N*86400000ms to the current instant.
function datePlusDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const noon = new Date(Date.UTC(y, m - 1, d, 12));
  noon.setUTCDate(noon.getUTCDate() + days);
  return dateFmt.format(noon);
}

function isDateBookable(date: string): boolean {
  const earliest = today();
  const latest = datePlusDays(earliest, MAX_DAYS_AHEAD);
  return date >= earliest && date <= latest;
}

function isUniqueViolation(err: unknown): boolean {
  return err instanceof Error && err.message.includes("UNIQUE");
}

function isForeignKeyViolation(err: unknown): boolean {
  return err instanceof Error && err.message.includes("FOREIGN KEY");
}

export function listRooms(filters: { library?: string; minCapacity?: number } = {}): Room[] {
  return db
    .select()
    .from(rooms)
    .all()
    .filter(
      (room) =>
        (!filters.library || room.library === filters.library) &&
        (filters.minCapacity === undefined || room.capacity >= filters.minCapacity),
    );
}

export function listBookingsForDate(date: string): Booking[] {
  return db.select().from(bookings).where(eq(bookings.date, date)).all();
}

export function listBookingsForEmail(email: string): Booking[] {
  const normalized = email.trim().toLowerCase();
  return db.select().from(bookings).where(eq(bookings.email, normalized)).all();
}

export function createBooking(input: { roomId: number; date: string; slot: number; name: string; email: string }): Booking {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();

  if (!name || !email) {
    throw new BookingError("missing_fields", ERROR_MESSAGES.missing_fields);
  }
  if (!isDateBookable(input.date)) {
    throw new BookingError("out_of_window", ERROR_MESSAGES.out_of_window);
  }
  // Checked before the opening-hours check below so a slot equal to "right
  // now" is rejected as past_slot at any time of day, even outside opening
  // hours — that's what keeps a test using the current Sydney hour
  // deterministic regardless of when it runs.
  if (input.date === today() && input.slot <= currentSydneyHour()) {
    throw new BookingError("past_slot", ERROR_MESSAGES.past_slot);
  }
  if (!Number.isInteger(input.slot) || input.slot < OPENING_HOUR || input.slot >= CLOSING_HOUR) {
    throw new BookingError("invalid_slot", ERROR_MESSAGES.invalid_slot);
  }
  const room = db.select().from(rooms).where(eq(rooms.id, input.roomId)).get();
  if (!room) {
    throw new BookingError("unknown_room", ERROR_MESSAGES.unknown_room);
  }

  // The daily-cap count and the insert must be one atomic unit — otherwise
  // two near-simultaneous requests could each see the cap unmet and both
  // insert, together exceeding it.
  return db.transaction((tx) => {
    const existing = tx
      .select()
      .from(bookings)
      .where(and(eq(bookings.email, email), eq(bookings.date, input.date)))
      .all();
    if (existing.length + 1 > MAX_HOURS_PER_DAY) {
      throw new BookingError("daily_cap", ERROR_MESSAGES.daily_cap);
    }
    try {
      return tx
        .insert(bookings)
        .values({ roomId: input.roomId, date: input.date, slot: input.slot, name, email })
        .returning()
        .get();
    } catch (err) {
      if (isUniqueViolation(err)) throw new BookingError("slot_taken", ERROR_MESSAGES.slot_taken);
      if (isForeignKeyViolation(err)) throw new BookingError("unknown_room", ERROR_MESSAGES.unknown_room);
      throw err;
    }
  });
}

export function cancelBooking(input: { id: number; email: string }): void {
  const email = input.email.trim().toLowerCase();
  const booking = db.select().from(bookings).where(eq(bookings.id, input.id)).get();
  if (!booking) {
    throw new BookingError("not_found", ERROR_MESSAGES.not_found);
  }
  if (booking.email !== email) {
    throw new BookingError("email_mismatch", ERROR_MESSAGES.email_mismatch);
  }
  db.delete(bookings).where(eq(bookings.id, input.id)).run();
}
