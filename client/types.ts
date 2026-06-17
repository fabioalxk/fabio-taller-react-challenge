export type Slot = {
  id: string;
  startsAt: string; // ISO datetime
  durationMinutes: number;
  taken: boolean;
};

export type Booking = {
  id: string;
  slotId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  createdAt: string;
};
