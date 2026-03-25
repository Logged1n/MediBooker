const BASE = '/api';

export interface LoginResponse {
  token: string;
  doctorId: string;
  displayName: string;
  role: string;
}

export interface Room {
  id: number;
  name: string;
  type: string;
  floor: number;
  available: boolean;
  isActive: boolean;
}

export interface Booking {
  id: number;
  roomId: number;
  roomName: string;
  doctorId: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
}

export interface Slot {
  start: string;
  end: string;
}

interface CreateBookingParams {
  roomId: number;
  date: string;
  startTime: string;
  endTime: string;
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('token');
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers as Record<string, string> | undefined),
    },
  });

  if (res.status === 204) return null as T;

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error((data as { message?: string })?.message ?? res.statusText);
  }

  return data as T;
}

export const api = {
  login: (username: string, password: string) =>
    request<LoginResponse>(`${BASE}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  register: (username: string, password: string, displayName: string, role = 'Doctor') =>
    request<LoginResponse>(`${BASE}/auth/register`, {
      method: 'POST',
      body: JSON.stringify({ username, password, displayName, role }),
    }),

  getRooms: () => request<Room[]>(`${BASE}/rooms`),

  getMyBookings: () => request<Booking[]>(`${BASE}/bookings/my`),

  getAllBookings: (date?: string) =>
    request<Booking[]>(`${BASE}/bookings/all${date ? `?date=${date}` : ''}`),

  createBooking: ({ roomId, date, startTime, endTime }: CreateBookingParams) =>
    request<Booking>(`${BASE}/bookings`, {
      method: 'POST',
      body: JSON.stringify({
        roomId,
        date,
        startTime: startTime + ':00',
        endTime: endTime + ':00',
      }),
    }),

  cancelBooking: (id: number) =>
    request<null>(`${BASE}/bookings/${id}`, { method: 'DELETE' }),

  getAvailableSlots: (roomId: number, date: string, duration = 60) =>
    request<Slot[]>(`${BASE}/rooms/${roomId}/available-slots?date=${date}&duration=${duration}`),

  createRoom: (room: Partial<Room>) =>
    request<Room>(`${BASE}/rooms`, {
      method: 'POST',
      body: JSON.stringify(room),
    }),

  updateRoom: (id: number, room: Room) =>
    request<null>(`${BASE}/rooms/${id}`, {
      method: 'PUT',
      body: JSON.stringify(room),
    }),

  deleteRoom: (id: number) =>
    request<null>(`${BASE}/rooms/${id}`, { method: 'DELETE' }),
};
