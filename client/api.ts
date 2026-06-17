import type { Slot, Booking } from "./types";

export async function fetchSlots(): Promise<Slot[]> {
  const r = await fetch("/api/slots");
  const data = await r.json();
  return data.slots;
}

export async function createBooking(input: {
  slotId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
}): Promise<Booking> {
  const r = await fetch("/api/bookings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(err.error ?? "booking failed");
  }
  return r.json();
}

export function formatSlot(startsAtIso: string): string {
  // Parse the full UTC instant (keep the "Z") and let the browser convert to local time
  const d = new Date(startsAtIso);
  return d.toLocaleString();
}
