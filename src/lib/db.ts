import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { type Booking, type Room, rooms } from "./schema";

// One SQLite file is the app's whole persistent state. In production
// fly.toml points DATABASE_PATH at the machine's volume (/data), which is
// how state survives a reload and a redeploy; locally it defaults to an
// untracked file in .data/.
const path = process.env.DATABASE_PATH ?? "./.data/app.db";
mkdirSync(dirname(path), { recursive: true });

const client = new Database(path);
client.pragma("journal_mode = WAL");
// SQLite doesn't enforce foreign keys unless a connection asks for it — the
// bookings.room_id reference is only real backpressure with this pragma set.
client.pragma("foreign_keys = ON");

export const db = drizzle(client);

// Migrations run at boot, on whatever machine holds the volume — the
// recommended shape for SQLite on Fly, where there's no separate machine to
// run them from. The flow: edit src/lib/schema.ts, `pnpm db:generate`,
// commit the migration it writes to drizzle/.
migrate(db, { migrationsFolder: "./drizzle" });

export type { Room, Booking };

// The real ANU library room list isn't public; these are illustrative
// stand-ins across the 4 libraries the brief names, seeded once so the app
// has something to book against. See README's "known limitations".
const SEED_ROOMS: Omit<Room, "id">[] = [
  { library: "Chifley", name: "Chifley G.12", capacity: 4, equipment: "whiteboard" },
  { library: "Chifley", name: "Chifley G.18", capacity: 8, equipment: "whiteboard,tv" },
  { library: "Chifley", name: "Chifley 3.05", capacity: 2, equipment: "" },
  { library: "Hancock", name: "Hancock 1.02", capacity: 6, equipment: "whiteboard,tv" },
  { library: "Hancock", name: "Hancock 1.07", capacity: 4, equipment: "whiteboard" },
  { library: "Hancock", name: "Hancock 2.14", capacity: 10, equipment: "whiteboard,tv,videoconf" },
  { library: "Menzies", name: "Menzies 1.01", capacity: 4, equipment: "whiteboard" },
  { library: "Menzies", name: "Menzies 2.06", capacity: 2, equipment: "" },
  { library: "Menzies", name: "Menzies 2.11", capacity: 8, equipment: "whiteboard,tv" },
  { library: "Law", name: "Law G.03", capacity: 4, equipment: "whiteboard" },
  { library: "Law", name: "Law 1.09", capacity: 6, equipment: "whiteboard,tv" },
  { library: "Law", name: "Law 2.02", capacity: 2, equipment: "" },
];

if (db.select().from(rooms).all().length === 0) {
  db.insert(rooms).values(SEED_ROOMS).run();
}
