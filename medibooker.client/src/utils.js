/**
 * Returns only rooms that are currently available.
 * @param {Array} rooms
 */
export function getAvailableRooms(rooms) {
  return rooms.filter((r) => r.available);
}

/**
 * Returns bookings belonging to a specific doctor.
 * @param {Array} bookings
 * @param {string} doctorName
 */
export function getDoctorBookings(bookings, doctorName) {
  return bookings.filter((b) => b.doctor === doctorName);
}

/**
 * Checks whether a new booking's time slot conflicts with any existing booking for the same room.
 * Times are plain "HH:MM" strings on the same date.
 *
 * @param {Array}  existingBookings  - bookings already in the system
 * @param {{ room: string, date: string, timeFrom: string, timeTo: string }} newBooking
 * @returns {boolean} true if a conflict exists
 */
export function hasTimeConflict(existingBookings, newBooking) {
  const { room, date, timeFrom, timeTo } = newBooking;
  const toMinutes = (t) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };
  const newFrom = toMinutes(timeFrom);
  const newTo = toMinutes(timeTo);

  return existingBookings.some((b) => {
    if (b.room !== room || b.date !== date) return false;
    const [bFrom, bTo] = b.time.split(' – ').map(toMinutes);
    return newFrom < bTo && newTo > bFrom;
  });
}

/**
 * Validates that a booking has a non-empty room, date,
 * and that timeFrom is strictly before timeTo.
 *
 * @param {{ room: string, date: string, timeFrom: string, timeTo: string }} booking
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateBooking(booking) {
  const { room, date, timeFrom, timeTo } = booking;
  if (!room) return { valid: false, error: 'Room is required' };
  if (!date)  return { valid: false, error: 'Date is required' };
  if (!timeFrom || !timeTo) return { valid: false, error: 'Time range is required' };

  const toMinutes = (t) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };
  if (toMinutes(timeFrom) >= toMinutes(timeTo)) {
    return { valid: false, error: 'Start time must be before end time' };
  }
  return { valid: true };
}
