// Reproduces the double-booking race condition.
// Fires N concurrent POST /api/bookings at the SAME slot and reports how many
// succeeded (HTTP 201). A correct server should accept exactly ONE.
//
//   1. npm run dev:server   (in another terminal)
//   2. npx tsx repro-double-booking.ts
import assert from "node:assert/strict";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const CONCURRENCY = Number(process.env.N ?? 5);

const slotsResp = await fetch(`${BASE}/api/slots`);
const { slots } = (await slotsResp.json()) as { slots: { id: string; taken: boolean }[] };
const free = slots.find((s) => !s.taken);
assert.ok(free, "expected at least one free slot");

console.log(`Firing ${CONCURRENCY} concurrent bookings at slot ${free.id}...`);

const results = await Promise.all(
  Array.from({ length: CONCURRENCY }, (_, i) =>
    fetch(`${BASE}/api/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slotId: free.id,
        customerName: `Racer ${i}`,
        customerEmail: `racer${i}@example.com`,
        customerPhone: "+1 555 0100",
      }),
    }).then((r) => r.status),
  ),
);

const created = results.filter((s) => s === 201).length;
const rejected = results.filter((s) => s === 409).length;

console.log(`status codes: ${JSON.stringify(results)}`);
console.log(`201 Created : ${created}`);
console.log(`409 Conflict: ${rejected}`);
console.log(created > 1 ? `\n❌ BUG REPRODUCED: ${created} bookings for one slot` : `\n✅ exactly one booking won`);
