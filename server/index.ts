import express from "express";
import type { Request, Response } from "express";
import { fileURLToPath } from "node:url";

// ============================================================
//  Booking service — tiny appointment scheduler
// ============================================================
//  GET  /api/slots                — list all slots (with availability)
//  POST /api/bookings             — book a slot
//  GET  /api/bookings/:id         — fetch a booking
// ============================================================

type Slot = {
  id: string;
  // ISO datetime (UTC) when the slot starts
  startsAt: string;
  durationMinutes: number;
};

type Booking = {
  id: string;
  slotId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  createdAt: string;
};

// In-memory data ---------------------------------------------------------

const slots: Slot[] = generateSlots();
const bookings: Booking[] = [];
// Slots claimed by an in-flight request that hasn't committed yet. Lets a
// concurrent request see a slot as taken before the booking is pushed.
const reservedSlotIds = new Set<string>();
// Monotonic id counter — never reuse an id even if a booking is rolled back.
let bookingCounter = 0;

// A slot is taken if it has a committed booking OR an in-flight reservation.
// Single source of truth for availability, used by both routes below.
function isSlotTaken(slotId: string): boolean {
  return reservedSlotIds.has(slotId) || bookings.some((b) => b.slotId === slotId);
}

function generateSlots(): Slot[] {
  // 24 slots, one per hour starting today 00:00 UTC
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const out: Slot[] = [];
  for (let i = 0; i < 24; i++) {
    const dt = new Date(start.getTime() + i * 60 * 60 * 1000);
    out.push({
      id: "s" + (i + 1),
      startsAt: dt.toISOString(),
      durationMinutes: 60,
    });
  }
  return out;
}

// Routes -----------------------------------------------------------------

const app = express();
app.use(express.json());

app.get("/api/slots", (_req: Request, res: Response) => {
  // Filter out slots whose start time is already in the past (UTC vs UTC)
  const now = new Date().toISOString();
  const available = slots
    .filter((s) => s.startsAt > now)
    .map((s) => ({ ...s, taken: isSlotTaken(s.id) }));
  res.json({ slots: available });
});

app.post("/api/bookings", (req: Request, res: Response) => {
  const { slotId, customerName, customerEmail, customerPhone } = req.body ?? {};

  console.log("[bookings] new booking request:", JSON.stringify(req.body));

  if (!slotId || !customerEmail) {
    return res.status(400).json({ error: "slotId and customerEmail are required" });
  }

  const slot = slots.find((s) => s.id === slotId);
  if (!slot) return res.status(404).json({ error: "slot not found" });

  // Claim the slot in the SAME synchronous tick as the check, so a concurrent
  // request cannot pass this guard before we commit. (A real DB uses a unique
  // constraint on slotId to enforce this atomically.)
  if (isSlotTaken(slotId)) {
    return res.status(409).json({ error: "slot already booked" });
  }
  reservedSlotIds.add(slotId);

  // Simulate the latency of writing to a database
  setTimeout(() => {
    const booking: Booking = {
      id: "b" + ++bookingCounter,
      slotId,
      customerName: customerName ?? "",
      customerEmail,
      customerPhone: customerPhone ?? "",
      createdAt: new Date().toISOString(),
    };
    bookings.push(booking);
    reservedSlotIds.delete(slotId);
    res.status(201).json(booking);
  }, 200);
});

app.get("/api/bookings/:id", (req: Request, res: Response) => {
  const b = bookings.find((x) => x.id === req.params.id);
  return b ? res.json(b) : res.status(404).end();
});

// Export the app so tests can mount it on an ephemeral port in-process.
export { app };

// Only start a real listener when this file is run directly (not when imported
// by a test). Works under both `tsx` and `tsx watch`.
const isEntrypoint = process.argv[1] === fileURLToPath(import.meta.url);
if (isEntrypoint) {
  const PORT = 3000;
  app.listen(PORT, () => console.log(`booking server listening on :${PORT}`));
}
