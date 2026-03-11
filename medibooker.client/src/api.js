const BASE = '/api';

// For demo purposes: doctor identity sent via header (no auth system yet)
export const CURRENT_DOCTOR_ID = 'dr-kowalski';
export const CURRENT_DOCTOR_NAME = 'Dr. Kowalski';

async function request(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Doctor-Id': CURRENT_DOCTOR_ID,
      ...options.headers,
    },
  });

  if (res.status === 204) return null;

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.message ?? res.statusText);
  }

  return data;
}

export const api = {
  getRooms: () =>
    request(`${BASE}/rooms`),

  getMyBookings: () =>
    request(`${BASE}/bookings/my`),

  getAllBookings: (date) =>
    request(`${BASE}/bookings/all${date ? `?date=${date}` : ''}`),

  createBooking: ({ roomId, date, startTime, endTime }) =>
    request(`${BASE}/bookings`, {
      method: 'POST',
      body: JSON.stringify({
        roomId,
        doctorId: CURRENT_DOCTOR_ID,
        date,
        startTime: startTime + ':00',
        endTime: endTime + ':00',
      }),
    }),

  cancelBooking: (id) =>
    request(`${BASE}/bookings/${id}`, { method: 'DELETE' }),
};
