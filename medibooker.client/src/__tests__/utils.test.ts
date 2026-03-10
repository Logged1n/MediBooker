import {
  getAvailableRooms,
  getDoctorBookings,
  hasTimeConflict,
  validateBooking,
  sortBookingsByDate,
  canCancelBooking,
  getBookingDurationMinutes,
  formatTimeSlot,
  groupBookingsByDate,
  type Room,
  type Booking,
  type BookingSlot,
} from '../utils';

// fixtures

const rooms: Room[] = [
  { id: 1, name: 'Room 101', type: 'Examination', floor: 1, available: true },
  { id: 2, name: 'Room 203', type: 'Surgery',     floor: 2, available: false },
  { id: 3, name: 'Room 115', type: 'Consultation',floor: 1, available: true },
];

const bookings: Booking[] = [
  { id: 1, room: 'Room 203', doctor: 'Dr. Kowalski', date: '2026-03-05', time: '09:00 – 10:00', status: 'active' },
  { id: 2, room: 'Room 210', doctor: 'Dr. Nowak',    date: '2026-03-05', time: '11:00 – 12:30', status: 'active' },
  { id: 3, room: 'Room 101', doctor: 'Dr. Kowalski', date: '2026-03-04', time: '14:00 – 15:00', status: 'completed' },
];

const slot: BookingSlot = { room: 'Room 203', date: '2026-03-10', timeFrom: '09:00', timeTo: '10:00' };

// getAvailableRooms

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

// getDoctorBookings

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

// hasTimeConflict

describe('hasTimeConflict', () => {
  const existing: Booking[] = [
    { id: 1, room: 'Room 203', doctor: 'Dr. X', date: '2026-03-10', time: '09:00 – 11:00', status: 'upcoming' },
  ];

  it('detects a fully overlapping slot', () => {
    expect(hasTimeConflict(existing, { ...slot, timeFrom: '09:00', timeTo: '11:00' })).toBe(true);
  });

  it('detects a slot that starts inside the existing one', () => {
    expect(hasTimeConflict(existing, { ...slot, timeFrom: '10:00', timeTo: '12:00' })).toBe(true);
  });

  it('detects a slot that ends inside the existing one', () => {
    expect(hasTimeConflict(existing, { ...slot, timeFrom: '08:00', timeTo: '10:00' })).toBe(true);
  });

  it('allows a slot that starts exactly when the existing one ends', () => {
    expect(hasTimeConflict(existing, { ...slot, timeFrom: '11:00', timeTo: '12:00' })).toBe(false);
  });

  it('allows a slot on a different day', () => {
    expect(hasTimeConflict(existing, { ...slot, date: '2026-03-11', timeFrom: '09:00', timeTo: '11:00' })).toBe(false);
  });

  it('allows a slot in a different room at the same time', () => {
    expect(hasTimeConflict(existing, { ...slot, room: 'Room 101', timeFrom: '09:00', timeTo: '11:00' })).toBe(false);
  });

  it('returns false when there are no existing bookings', () => {
    expect(hasTimeConflict([], slot)).toBe(false);
  });
});

// validateBooking

describe('validateBooking', () => {
  const valid: BookingSlot = { room: 'Room 101', date: '2026-03-20', timeFrom: '09:00', timeTo: '10:00' };

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

// sortBookingsByDate

describe('sortBookingsByDate', () => {
  it('sorts bookings in chronological order', () => {
    const unsorted: Booking[] = [
      { id: 1, room: 'R1', doctor: 'D', date: '2026-03-15', time: '10:00 – 11:00', status: 'upcoming' },
      { id: 2, room: 'R2', doctor: 'D', date: '2026-03-12', time: '08:00 – 09:00', status: 'upcoming' },
      { id: 3, room: 'R3', doctor: 'D', date: '2026-03-20', time: '14:00 – 15:00', status: 'upcoming' },
    ];
    const sorted = sortBookingsByDate(unsorted);
    expect(sorted.map((b) => b.date)).toEqual(['2026-03-12', '2026-03-15', '2026-03-20']);
  });

  it('sorts by start time when dates are equal', () => {
    const sameDay: Booking[] = [
      { id: 1, room: 'R1', doctor: 'D', date: '2026-03-15', time: '14:00 – 15:00', status: 'upcoming' },
      { id: 2, room: 'R2', doctor: 'D', date: '2026-03-15', time: '08:00 – 09:00', status: 'upcoming' },
    ];
    const sorted = sortBookingsByDate(sameDay);
    expect(sorted[0].time).toBe('08:00 – 09:00');
    expect(sorted[1].time).toBe('14:00 – 15:00');
  });

  it('does not mutate the original array', () => {
    const original: Booking[] = [
      { id: 1, room: 'R1', doctor: 'D', date: '2026-03-15', time: '10:00 – 11:00', status: 'upcoming' },
      { id: 2, room: 'R2', doctor: 'D', date: '2026-03-12', time: '08:00 – 09:00', status: 'upcoming' },
    ];
    const originalOrder = original.map((b) => b.id);
    sortBookingsByDate(original);
    expect(original.map((b) => b.id)).toEqual(originalOrder);
  });
});

// canCancelBooking

describe('canCancelBooking', () => {
  it('returns true for upcoming booking', () => {
    expect(canCancelBooking('upcoming')).toBe(true);
  });

  it('returns true for active booking', () => {
    expect(canCancelBooking('active')).toBe(true);
  });

  it('returns false for completed booking', () => {
    expect(canCancelBooking('completed')).toBe(false);
  });

  it('returns false for already cancelled booking', () => {
    expect(canCancelBooking('cancelled')).toBe(false);
  });
});

// getBookingDurationMinutes

describe('getBookingDurationMinutes', () => {
  it('returns 60 for a one-hour slot', () => {
    expect(getBookingDurationMinutes('09:00', '10:00')).toBe(60);
  });

  it('returns 90 for a 90-minute slot', () => {
    expect(getBookingDurationMinutes('08:00', '09:30')).toBe(90);
  });

  it('returns 0 when start equals end', () => {
    expect(getBookingDurationMinutes('10:00', '10:00')).toBe(0);
  });
});

// formatTimeSlot

describe('formatTimeSlot', () => {
  it('formats a time slot with an em dash separator', () => {
    expect(formatTimeSlot('09:00', '10:30')).toBe('09:00 – 10:30');
  });

  it('preserves leading zeros in times', () => {
    expect(formatTimeSlot('08:05', '09:00')).toBe('08:05 – 09:00');
  });
});

// groupBookingsByDate

describe('groupBookingsByDate', () => {
  it('groups bookings by their date', () => {
    const grouped = groupBookingsByDate(bookings);
    expect(Object.keys(grouped)).toHaveLength(2);
    expect(grouped['2026-03-05']).toHaveLength(2);
    expect(grouped['2026-03-04']).toHaveLength(1);
  });

  it('returns empty object for empty input', () => {
    expect(groupBookingsByDate([])).toEqual({});
  });

  it('returns single group when all bookings share one date', () => {
    const sameDay: Booking[] = bookings
      .slice(0, 2)
      .map((b) => ({ ...b, date: '2026-03-10' }));
    const grouped = groupBookingsByDate(sameDay);
    expect(Object.keys(grouped)).toHaveLength(1);
    expect(grouped['2026-03-10']).toHaveLength(2);
  });
});
