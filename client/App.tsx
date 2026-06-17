import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { fetchSlots, createBooking, formatSlot } from "./api";
import type { Slot } from "./types";

function App() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selected, setSelected] = useState<Slot | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    fetchSlots().then(setSlots);
  }, []);

  async function refresh() {
    const next = await fetchSlots();
    setSlots(next);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    try {
      // Optimistically mark the slot as taken so the UI updates instantly
      selected.taken = true;
      setSlots(slots);

      const b = await createBooking({
        slotId: selected.id,
        customerName: name,
        customerEmail: email,
        customerPhone: phone,
      });
      setMessage({ kind: "ok", text: `Booked! Confirmation: ${b.id} at ${formatSlot(selected.startsAt)}` });
      setSelected(null);
      setName(""); setEmail(""); setPhone("");
    } catch (err) {
      setMessage({ kind: "err", text: (err as Error).message });
    }
  }

  return (
    <div>
      <h1>Book a session</h1>
      <p>{slots.length} slots loaded</p>

      <div>
        {slots.map((s) => (
          <div key={s.id} className={"slot" + (s.taken ? " taken" : "")}>
            <span>{formatSlot(s.startsAt)} ({s.durationMinutes} min)</span>
            <button
              disabled={s.taken}
              onClick={() => setSelected(s)}
            >
              {s.taken ? "Booked" : "Choose"}
            </button>
          </div>
        ))}
      </div>

      {selected && (
        <form onSubmit={onSubmit}>
          <h2>You picked {formatSlot(selected.startsAt)}</h2>
          <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <button type="submit">Confirm booking</button>
        </form>
      )}

      {message && (
        <p className={message.kind}>{message.text}</p>
      )}
    </div>
  );
}

const root = createRoot(document.getElementById("root")!);
root.render(<App />);
