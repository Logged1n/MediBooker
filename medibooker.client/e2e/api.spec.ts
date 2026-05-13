import { test, expect, request as playwrightRequest } from '@playwright/test';
import { toLocalDateStr } from './helpers';

const BASE = 'https://localhost:7075';

function getNextWeekday(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  return toLocalDateStr(d);
}

function getNextSaturday(): string {
  const d = new Date();
  const daysUntilSat = ((6 - d.getDay()) + 7) % 7 || 7;
  d.setDate(d.getDate() + daysUntilSat);
  return toLocalDateStr(d);
}

// ============================================================
// Testy backendu (API) — bezpośrednie wywołania HTTP
// ============================================================

// Test A1 — GET /api/rooms zwraca poprawną strukturę pokoi
test('GET /api/rooms zwraca co najmniej 6 pokoi z wymaganymi polami', async () => {
  const ctx = await playwrightRequest.newContext({ ignoreHTTPSErrors: true });

  const res = await ctx.get(`${BASE}/api/rooms`);

  expect(res.ok()).toBeTruthy();
  const rooms = await res.json();
  expect(Array.isArray(rooms)).toBe(true);
  expect(rooms.length).toBeGreaterThanOrEqual(6);

  const room = rooms[0];
  expect(room).toHaveProperty('id');
  expect(room).toHaveProperty('name');
  expect(room).toHaveProperty('type');
  expect(room).toHaveProperty('floor');
  expect(room).toHaveProperty('available');

  await ctx.dispose();
});

// Test A2 — POST /api/bookings bez tokenu JWT zwraca 401
test('POST /api/bookings bez tokenu JWT zwraca 401 Unauthorized', async () => {
  const ctx = await playwrightRequest.newContext({ ignoreHTTPSErrors: true });

  const res = await ctx.post(`${BASE}/api/bookings`, {
    data: {
      roomId: 1,
      date: getNextWeekday(),
      startTime: '09:00:00',
      endTime: '10:00:00',
    },
  });

  expect(res.status()).toBe(401);

  await ctx.dispose();
});

// Test A3 — Próba rezerwacji w godzinach przerwy konserwacyjnej (13:00–14:00) zwraca 400
test('POST /api/bookings w godzinach przerwy konserwacyjnej zwraca 400 Bad Request', async () => {
  const ctx = await playwrightRequest.newContext({ ignoreHTTPSErrors: true });

  const loginRes = await ctx.post(`${BASE}/api/auth/login`, {
    data: { username: 'dr-kowalski', password: 'pass123' },
  });
  expect(loginRes.ok()).toBeTruthy();
  const { token } = await loginRes.json();

  // Pobierz aktywną salę dynamicznie — inne testy mogą dezaktywować salę o id=1
  const roomsRes = await ctx.get(`${BASE}/api/rooms`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const rooms = await roomsRes.json();
  const activeRoom = rooms.find((r: { isActive: boolean }) => r.isActive);
  expect(activeRoom).toBeDefined();

  const bookingRes = await ctx.post(`${BASE}/api/bookings`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      roomId: activeRoom.id,
      date: getNextWeekday(),
      startTime: '13:00:00',
      endTime: '14:00:00',
    },
  });

  expect(bookingRes.status()).toBe(400);
  const body = await bookingRes.json();
  expect(body.message).toContain('maintenance');

  await ctx.dispose();
});

// Test A4 — Próba rezerwacji w weekend zwraca 400
test('POST /api/bookings w weekend zwraca 400 Bad Request', async () => {
  const ctx = await playwrightRequest.newContext({ ignoreHTTPSErrors: true });

  const loginRes = await ctx.post(`${BASE}/api/auth/login`, {
    data: { username: 'dr-kowalski', password: 'pass123' },
  });
  const { token } = await loginRes.json();

  // Pobierz aktywną salę dynamicznie
  const roomsRes = await ctx.get(`${BASE}/api/rooms`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const rooms = await roomsRes.json();
  const activeRoom = rooms.find((r: { isActive: boolean }) => r.isActive);
  expect(activeRoom).toBeDefined();

  const bookingRes = await ctx.post(`${BASE}/api/bookings`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      roomId: activeRoom.id,
      date: getNextSaturday(),
      startTime: '10:00:00',
      endTime: '11:00:00',
    },
  });

  expect(bookingRes.status()).toBe(400);
  const body = await bookingRes.json();
  expect(body.message.toLowerCase()).toContain('weekday');

  await ctx.dispose();
});