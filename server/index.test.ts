// Happy-path smoke tests for the booking server.
// These tests currently pass. That doesn't mean the service is correct.
//
// Run after `npm run dev:server` is up:
//   npx tsx server/index.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";

test("GET /api/slots returns a list", async () => {
  const r = await fetch(`${BASE}/api/slots`);
  assert.equal(r.status, 200);
  const body = await r.json() as { slots: unknown[] };
  assert.ok(Array.isArray(body.slots));
});

test("POST /api/bookings on a free slot returns 201", async () => {
  // Find a slot id from the list
  const slotsResp = await fetch(`${BASE}/api/slots`);
  const { slots } = await slotsResp.json() as { slots: { id: string; taken: boolean }[] };
  const free = slots.find((s) => !s.taken);
  assert.ok(free, "expected at least one free slot to test against");

  const r = await fetch(`${BASE}/api/bookings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      slotId: free.id,
      customerName: "Test User",
      customerEmail: "happy@example.com",
      customerPhone: "+1 555 0100",
    }),
  });
  assert.equal(r.status, 201);
  const booking = await r.json();
  assert.ok(booking.id);
  assert.equal(booking.slotId, free.id);
});
