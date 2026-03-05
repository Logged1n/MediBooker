import {
  getAvailableRooms,
  getDoctorBookings,
  hasTimeConflict,
  validateBooking,
} from '../utils';

// ─── fixtures ────────────────────────────────────────────────────────────────

const rooms = [
  { id: 1, name: 'Room 101', available: true },
  { id: 2, name: 'Room 203', available: false },
  { id: 3, name: 'Room 115', available: true },
];

const bookings = [
  { id: 1, room: 'Room 203', doctor: 'Dr. Kowalski', date: '2026-03-05', time: '09:00 – 10:00' },
  { id: 2, room: 'Room 210', doctor: 'Dr. Nowak',    date: '2026-03-05', time: '11:00 – 12:30' },
  { id: 3, room: 'Room 101', doctor: 'Dr. Kowalski', date: '2026-03-04', time: '14:00 – 15:00' },
];

// ─── getAvailableRooms ────────────────────────────────────────────────────────

describe('getAvailableRooms', () => {
  it('returns only available rooms', () => {
    const result = getAvailableRooms(rooms);
    expect(result).toHaveLength(2);
    expect(result.every((r) => r.available)).toBe(true);
  });

  it('returns empty array when no rooms are available', () => {
    const occupied = rooms.map((r) => ({ ...r, available: false }));
    expect(getAvailableRooms(occupied)).toEqual([]);
  });

  it('returns all rooms when all are available', () => {
    const free = rooms.map((r) => ({ ...r, available: true }));
    expect(getAvailableRooms(free)).toHaveLength(3);
  });
});

// ─── getDoctorBookings ────────────────────────────────────────────────────────

describe('getDoctorBookings', () => {
  it('returns bookings for the given doctor', () => {
    const result = getDoctorBookings(bookings, 'Dr. Kowalski');
    expect(result).toHaveLength(2);
    expect(result.every((b) => b.doctor === 'Dr. Kowalski')).toBe(true);
  });

  it('returns empty array when doctor has no bookings', () => {
    expect(getDoctorBookings(bookings, 'Dr. Nobody')).toEqual([]);
  });

  it('is case-sensitive', () => {
    expect(getDoctorBookings(bookings, 'dr. kowalski')).toEqual([]);
  });
});

// ─── hasTimeConflict ──────────────────────────────────────────────────────────

describe('hasTimeConflict', () => {
  const existing = [
    { room: 'Room 203', date: '2026-03-05', time: '09:00 – 11:00' },
  ];

  it('detects a fully overlapping slot', () => {
    expect(
      hasTimeConflict(existing, {
        room: 'Room 203', date: '2026-03-05', timeFrom: '09:00', timeTo: '11:00',
      })
    ).toBe(true);
  });

  it('detects a partially overlapping slot (starts inside)', () => {
    expect(
      hasTimeConflict(existing, {
        room: 'Room 203', date: '2026-03-05', timeFrom: '10:00', timeTo: '12:00',
      })
    ).toBe(true);
  });

  it('detects a partially overlapping slot (ends inside)', () => {
    expect(
      hasTimeConflict(existing, {
        room: 'Room 203', date: '2026-03-05', timeFrom: '08:00', timeTo: '10:00',
      })
    ).toBe(true);
  });

  it('allows a slot that starts exactly when the existing one ends', () => {
    expect(
      hasTimeConflict(existing, {
        room: 'Room 203', date: '2026-03-05', timeFrom: '11:00', timeTo: '12:00',
      })
    ).toBe(false);
  });

  it('allows a slot on a different day', () => {
    expect(
      hasTimeConflict(existing, {
        room: 'Room 203', date: '2026-03-06', timeFrom: '09:00', timeTo: '11:00',
      })
    ).toBe(false);
  });

  it('allows a slot in a different room at the same time', () => {
    expect(
      hasTimeConflict(existing, {
        room: 'Room 101', date: '2026-03-05', timeFrom: '09:00', timeTo: '11:00',
      })
    ).toBe(false);
  });

  it('returns false when there are no existing bookings', () => {
    expect(
      hasTimeConflict([], {
        room: 'Room 203', date: '2026-03-05', timeFrom: '09:00', timeTo: '10:00',
      })
    ).toBe(false);
  });
});

// ─── validateBooking ──────────────────────────────────────────────────────────

describe('validateBooking', () => {
  const valid = { room: 'Room 101', date: '2026-03-05', timeFrom: '09:00', timeTo: '10:00' };

  it('accepts a correct booking', () => {
    expect(validateBooking(valid)).toEqual({ valid: true });
  });

  it('rejects when room is missing', () => {
    const result = validateBooking({ ...valid, room: '' });
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/room/i);
  });

  it('rejects when date is missing', () => {
    const result = validateBooking({ ...valid, date: '' });
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/date/i);
  });

  it('rejects when timeFrom is missing', () => {
    const result = validateBooking({ ...valid, timeFrom: '' });
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/time/i);
  });

  it('rejects when start equals end', () => {
    const result = validateBooking({ ...valid, timeFrom: '10:00', timeTo: '10:00' });
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/before/i);
  });

  it('rejects when start is after end', () => {
    const result = validateBooking({ ...valid, timeFrom: '12:00', timeTo: '09:00' });
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/before/i);
  });
});
