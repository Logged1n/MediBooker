export type BookingStatus = 'upcoming' | 'active' | 'completed' | 'cancelled';

export interface Room {
  id: number;
  name: string;
  type: string;
  floor: number;
  available: boolean;
}

export interface Booking {
  id: number;
  room: string;
  doctor: string;
  date: string;      // "YYYY-MM-DD"
  time: string;      // "HH:MM – HH:MM"
  status: BookingStatus;
}

export interface BookingSlot {
  room: string;
  date: string;
  timeFrom: string;  // "HH:MM"
  timeTo: string;    // "HH:MM"
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function toMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

// ─── getAvailableRooms ────────────────────────────────────────────────────────

export function getAvailableRooms(rooms: Room[]): Room[] {
  return rooms.filter((r) => r.available);
}

// ─── getDoctorBookings ────────────────────────────────────────────────────────

export function getDoctorBookings(bookings: Booking[], doctorName: string): Booking[] {
  return bookings.filter((b) => b.doctor === doctorName);
}

// ─── hasTimeConflict ──────────────────────────────────────────────────────────

export function hasTimeConflict(existingBookings: Booking[], newBooking: BookingSlot): boolean {
  const { room, date, timeFrom, timeTo } = newBooking;
  const newFrom = toMinutes(timeFrom);
  const newTo = toMinutes(timeTo);

  return existingBookings.some((b) => {
    if (b.room !== room || b.date !== date) return false;
    const [bFrom, bTo] = b.time.split(' – ').map(toMinutes);
    return newFrom < bTo && newTo > bFrom;
  });
}

// ─── validateBooking ──────────────────────────────────────────────────────────

export function validateBooking(booking: BookingSlot): ValidationResult {
  const { room, date, timeFrom, timeTo } = booking;
  if (!room)              return { valid: false, error: 'Room is required' };
  if (!date)              return { valid: false, error: 'Date is required' };
  if (!timeFrom || !timeTo) return { valid: false, error: 'Time range is required' };
  if (toMinutes(timeFrom) >= toMinutes(timeTo))
    return { valid: false, error: 'Start time must be before end time' };
  return { valid: true };
}

// ─── sortBookingsByDate ───────────────────────────────────────────────────────

export function sortBookingsByDate(bookings: Booking[]): Booking[] {
  return [...bookings].sort((a, b) => {
    const dateCmp = a.date.localeCompare(b.date);
    if (dateCmp !== 0) return dateCmp;
    const aFrom = a.time.split(' – ')[0];
    const bFrom = b.time.split(' – ')[0];
    return toMinutes(aFrom) - toMinutes(bFrom);
  });
}

// ─── canCancelBooking ─────────────────────────────────────────────────────────

export function canCancelBooking(status: BookingStatus): boolean {
  return status === 'upcoming' || status === 'active';
}

// ─── getBookingDurationMinutes ────────────────────────────────────────────────

export function getBookingDurationMinutes(timeFrom: string, timeTo: string): number {
  return toMinutes(timeTo) - toMinutes(timeFrom);
}

// ─── formatTimeSlot ──────────────────────────────────────────────────────────

export function formatTimeSlot(timeFrom: string, timeTo: string): string {
  return `${timeFrom} – ${timeTo}`;
}

// ─── groupBookingsByDate ──────────────────────────────────────────────────────

export function groupBookingsByDate(bookings: Booking[]): Record<string, Booking[]> {
  return bookings.reduce<Record<string, Booking[]>>((acc, b) => {
    (acc[b.date] ??= []).push(b);
    return acc;
  }, {});
}
