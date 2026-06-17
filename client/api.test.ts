// Tests for the client API helpers.
import assert from "node:assert/strict";
import { test, afterEach } from "node:test";
import { fetchSlots, createBooking, formatSlot } from "./api.ts";

// Mirror formatSlot's options so the test stays decoupled from the machine's zone.
const reference = new Intl.DateTimeFormat(undefined, {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZoneName: "short",
});

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

test("formatSlot formats the exact instant in the local zone with a label", () => {
  const iso = "2026-06-17T05:00:00.000Z";
  // Proves formatSlot parses the full ISO instant, not a truncated version.
  assert.equal(formatSlot(iso), reference.format(new Date(iso)));
  assert.match(formatSlot(iso), /\s\S/);
});

test("formatSlot treats the same instant in different offsets identically", () => {
  // Same moment in time: the old bug sliced off the offset and read these as
  // different local times; the fix must format them identically.
  const utc = "2026-06-17T05:00:00.000Z";
  const offset = "2026-06-17T00:00:00.000-05:00";
  assert.equal(formatSlot(utc), formatSlot(offset));
});

test("fetchSlots returns the slots array from the response", async () => {
  const slots = [{ id: "s1", startsAt: "2026-06-17T05:00:00.000Z", durationMinutes: 60, taken: false }];
  let calledUrl = "";
  globalThis.fetch = (async (url: string) => {
    calledUrl = url;
    return { json: async () => ({ slots }) };
  }) as typeof fetch;

  const result = await fetchSlots();
  assert.equal(calledUrl, "/api/slots");
  assert.deepEqual(result, slots);
});

const input = {
  slotId: "s1",
  customerName: "Ada",
  customerEmail: "ada@example.com",
  customerPhone: "+1 555 0100",
};

test("createBooking posts the input and returns the created booking", async () => {
  const booking = { id: "b1", slotId: "s1" };
  let init: RequestInit = {};
  let calledUrl = "";
  globalThis.fetch = (async (url: string, opts: RequestInit) => {
    calledUrl = url;
    init = opts;
    return { ok: true, json: async () => booking };
  }) as typeof fetch;

  const result = await createBooking(input);
  assert.equal(calledUrl, "/api/bookings");
  assert.equal(init.method, "POST");
  assert.deepEqual(JSON.parse(init.body as string), input);
  assert.deepEqual(result, booking);
});

test("createBooking throws the server error message on a non-ok response", async () => {
  globalThis.fetch = (async () => ({
    ok: false,
    json: async () => ({ error: "slot already booked" }),
  })) as typeof fetch;

  await assert.rejects(createBooking(input), /slot already booked/);
});

test("createBooking throws a default message when the error body is unreadable", async () => {
  globalThis.fetch = (async () => ({
    ok: false,
    json: async () => {
      throw new Error("not json");
    },
  })) as typeof fetch;

  await assert.rejects(createBooking(input), /booking failed/);
});
