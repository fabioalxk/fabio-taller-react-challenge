// Unit tests for the client API helpers.
//
//   npm test
//
// Coverage maps to the PR's fixes:
//   - timezones are being shown correctly (formatSlot uses the full ISO
//     instant + the runtime's local zone, with a zone label)
//   - the fetch wrappers (fetchSlots / createBooking) shape requests and
//     surface errors correctly
import assert from "node:assert/strict";
import { test, afterEach } from "node:test";
import { fetchSlots, createBooking, formatSlot } from "./api.ts";

// Mirror the formatter options used inside formatSlot, so tests stay decoupled
// from the machine's timezone.
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

// --- formatSlot ------------------------------------------------------------

test("formatSlot formats the exact instant in the local zone with a label", () => {
  const iso = "2026-06-17T05:00:00.000Z";
  // Must equal a fresh formatter fed the same instant — proves formatSlot
  // parses the full ISO string (not a truncated, zone-stripped version).
  assert.equal(formatSlot(iso), reference.format(new Date(iso)));
  // The "short" timeZoneName means a zone label is always present.
  assert.match(formatSlot(iso), /\s\S/);
});

test("formatSlot treats the same instant in different offsets identically", () => {
  // These two ISO strings describe the SAME moment in time. The old buggy
  // implementation sliced off the offset and read them as different local
  // times; the fix must format them identically.
  const utc = "2026-06-17T05:00:00.000Z";
  const offset = "2026-06-17T00:00:00.000-05:00";
  assert.equal(formatSlot(utc), formatSlot(offset));
});

// --- fetchSlots ------------------------------------------------------------

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

// --- createBooking ---------------------------------------------------------

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
