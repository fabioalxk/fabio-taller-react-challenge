// Unit tests for the booking server.
//
// These are self-contained: they mount the exported `app` on an ephemeral
// port in-process, so no separately running server is required.
//
//   npm test
//
// Coverage maps to the PR's fixes:
//   - prevent double-booking race condition (reserved set + isSlotTaken)
//   - only show booking times that are ahead (past-slot filtering)
//   - monotonic, never-reused booking ids
//   - input validation / not-found behaviour
import assert from "node:assert/strict";
import { test, before, after } from "node:test";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { app } from "./index.ts";

let server: Server;
let base: string;

before(async () => {
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const { port } = server.address() as AddressInfo;
      base = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

after(() => {
  server.close();
});

// --- helpers ---------------------------------------------------------------

type ApiSlot = { id: string; startsAt: string; durationMinutes: number; taken: boolean };

async function getSlots(): Promise<ApiSlot[]> {
  const r = await fetch(`${base}/api/slots`);
  assert.equal(r.status, 200);
  const body = (await r.json()) as { slots: ApiSlot[] };
  return body.slots;
}

function book(slotId: string, extra: Record<string, unknown> = {}) {
  return fetch(`${base}/api/bookings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      slotId,
      customerName: "Test User",
      customerEmail: "test@example.com",
      customerPhone: "+1 555 0100",
      ...extra,
    }),
  });
}

// Compute the set of slot ids the server *should* expose right now: the 24
// hourly slots from today 00:00 UTC, keeping only those still in the future.
function expectedFutureIds(): string[] {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const now = new Date().toISOString();
  const ids: string[] = [];
  for (let i = 0; i < 24; i++) {
    const dt = new Date(start.getTime() + i * 60 * 60 * 1000);
    if (dt.toISOString() > now) ids.push("s" + (i + 1));
  }
  return ids;
}

// --- GET /api/slots --------------------------------------------------------

test("GET /api/slots returns a list with availability flags", async () => {
  const slots = await getSlots();
  assert.ok(Array.isArray(slots));
  for (const s of slots) {
    assert.equal(typeof s.id, "string");
    assert.equal(typeof s.startsAt, "string");
    assert.equal(s.durationMinutes, 60);
    assert.equal(typeof s.taken, "boolean");
  }
});

test("GET /api/slots only returns slots that start in the future", async () => {
  const slots = await getSlots();
  const now = new Date().toISOString();

  // Core invariant of the "only show times ahead" fix.
  for (const s of slots) {
    assert.ok(s.startsAt > now, `slot ${s.id} (${s.startsAt}) is not in the future`);
  }

  // The old bug compared against a date prefix and so returned *every* slot of
  // today, including past hours. s1 starts at 00:00 UTC, which is always past
  // by the time these tests run, so it must be filtered out now.
  assert.ok(!slots.some((s) => s.id === "s1"), "expected the 00:00 slot to be filtered out");
  // ...and the filter must actually drop something (never returns all 24).
  assert.ok(slots.length < 24, "expected past slots to be filtered out");

  // The returned ids must match the independently-computed future set.
  assert.deepEqual(
    slots.map((s) => s.id).sort(),
    expectedFutureIds().sort(),
  );
});

// --- POST /api/bookings: validation & lookup -------------------------------

test("POST /api/bookings without slotId returns 400", async () => {
  const r = await book("", { slotId: undefined });
  assert.equal(r.status, 400);
});

test("POST /api/bookings without customerEmail returns 400", async () => {
  const r = await book("s5", { customerEmail: undefined });
  assert.equal(r.status, 400);
});

test("POST /api/bookings for an unknown slot returns 404", async () => {
  const r = await book("does-not-exist");
  assert.equal(r.status, 404);
});

// --- POST /api/bookings: happy path ----------------------------------------

test("POST /api/bookings on a free slot returns 201 and the booking", async () => {
  const r = await book("s6");
  assert.equal(r.status, 201);
  const booking = (await r.json()) as { id: string; slotId: string; customerEmail: string };
  assert.ok(booking.id);
  assert.equal(booking.slotId, "s6");
  assert.equal(booking.customerEmail, "test@example.com");

  // The booking is retrievable by id.
  const got = await fetch(`${base}/api/bookings/${booking.id}`);
  assert.equal(got.status, 200);
  const fetched = (await got.json()) as { id: string };
  assert.equal(fetched.id, booking.id);
});

test("POST /api/bookings defaults optional name/phone to empty strings", async () => {
  const r = await book("s11", { customerName: undefined, customerPhone: undefined });
  assert.equal(r.status, 201);
  const booking = (await r.json()) as { customerName: string; customerPhone: string };
  assert.equal(booking.customerName, "");
  assert.equal(booking.customerPhone, "");
});

test("booking the same slot twice (sequentially) returns 409 the second time", async () => {
  const first = await book("s7");
  assert.equal(first.status, 201);

  const second = await book("s7");
  assert.equal(second.status, 409);
});

test("GET /api/bookings/:id for an unknown id returns 404", async () => {
  const r = await fetch(`${base}/api/bookings/nope`);
  assert.equal(r.status, 404);
});

// --- double-booking race condition (the headline fix) ----------------------

test("concurrent bookings on one slot: exactly one wins (201), the rest 409", async () => {
  const N = 8;
  const results = await Promise.all(
    Array.from({ length: N }, (_, i) =>
      book("s8", { customerEmail: `racer${i}@example.com` }).then((r) => r.status),
    ),
  );

  const created = results.filter((s) => s === 201).length;
  const conflicts = results.filter((s) => s === 409).length;

  assert.equal(created, 1, `expected exactly one 201, got ${created} (${JSON.stringify(results)})`);
  assert.equal(conflicts, N - 1, `expected ${N - 1} conflicts, got ${conflicts}`);
});

test("an in-flight reservation marks the slot taken before the booking commits", async () => {
  // Pick a free, future slot so it appears in /api/slots.
  const free = (await getSlots()).find((s) => !s.taken);
  assert.ok(free, "expected at least one free future slot");

  // Fire the booking but do NOT await it: the commit is delayed ~200ms, so
  // while it is in flight the slot must already read as taken. Give the request
  // a moment to reach the server and claim the reservation (well under the
  // 200ms commit window) before we check availability.
  const pending = book(free!.id);
  await new Promise((r) => setTimeout(r, 60));

  const slots = await getSlots();
  const inList = slots.find((s) => s.id === free!.id);
  assert.equal(inList?.taken, true, "reserved slot should read as taken before commit");

  const r = await pending;
  assert.equal(r.status, 201);
});

// --- monotonic, never-reused ids -------------------------------------------

test("booking ids are unique and monotonically increasing", async () => {
  const r1 = await book("s9");
  const r2 = await book("s10");
  assert.equal(r1.status, 201);
  assert.equal(r2.status, 201);

  const b1 = (await r1.json()) as { id: string };
  const b2 = (await r2.json()) as { id: string };

  assert.notEqual(b1.id, b2.id);
  const n1 = Number(b1.id.replace(/^b/, ""));
  const n2 = Number(b2.id.replace(/^b/, ""));
  assert.ok(n2 > n1, `expected ${b2.id} to come after ${b1.id}`);
});
