import { spawn } from "node:child_process";
import { existsSync, mkdtempSync } from "node:fs";
import { type AddressInfo, createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { TestProject } from "vitest/node";
import { FIXTURE_BOOKING } from "./routes";

declare module "vitest" {
  export interface ProvidedContext {
    baseUrl: string;
  }
}

// Boot the BUILT server (the same artefact the Dockerfile runs) on a free
// port with a throwaway database, so the spec asserts what actually ships —
// not the dev server, and never your local data.
export default async function setup(project: TestProject): Promise<() => void> {
  const entry = "./dist/server/entry.mjs";
  if (!existsSync(entry)) {
    throw new Error(`${entry} not found — run \`pnpm test\`, which builds first`);
  }

  const port = await new Promise<number>((resolve) => {
    const probe = createServer();
    probe.listen(0, () => {
      const address = probe.address() as AddressInfo;
      probe.close(() => resolve(address.port));
    });
  });

  const server = spawn("node", [entry], {
    env: {
      ...process.env,
      HOST: "127.0.0.1",
      PORT: String(port),
      DATABASE_PATH: join(mkdtempSync(join(tmpdir(), "spec-db-")), "test.db"),
    },
    stdio: "ignore",
  });

  const baseUrl = `http://127.0.0.1:${port}`;
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(baseUrl);
      if (res.ok) break;
    } catch {
      // not up yet
    }
    if (attempt >= 50) {
      server.kill();
      throw new Error(`server did not come up at ${baseUrl}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  // The invariants' /bookings route needs a booking to render its table and
  // success banner; make it over HTTP, the same way a person would.
  const fixture = await fetch(new URL("/api/bookings", baseUrl), {
    method: "POST",
    headers: { origin: baseUrl },
    body: new URLSearchParams({
      roomId: String(FIXTURE_BOOKING.roomId),
      date: FIXTURE_BOOKING.date,
      slot: String(FIXTURE_BOOKING.slot),
      name: "Invariants Fixture",
      email: FIXTURE_BOOKING.email,
    }),
    redirect: "manual",
  });
  const location = fixture.headers.get("location") ?? "";
  if (!location.includes(`booked=${FIXTURE_BOOKING.id}`)) {
    server.kill();
    throw new Error(`fixture booking failed (${fixture.status} → ${location})`);
  }

  project.provide("baseUrl", baseUrl);
  return () => {
    server.kill();
  };
}
