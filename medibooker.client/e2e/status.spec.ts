import { test, expect, request as playwrightRequest } from '@playwright/test';
import { loginAs, toLocalDateStr } from './helpers';

// Pomocnik: zwraca godziny dla rezerwacji trwającej teraz.
// Używa bieżącej GODZINY (H:00 – H+1:00), dzięki czemu startTime < endTime
// i rezerwacja jest zawsze aktywna w trakcie tej godziny.
function getCurrentBookingTimes(): { startTime: string; endTime: string } {
  const h = new Date().getHours();
  const startHour = h;
  const endHour   = h < 23 ? h + 1 : 23;
  const endMin    = h < 23 ? '00' : '59';
  return {
    startTime: `${String(startHour).padStart(2, '0')}:00:00`,
    endTime:   `${String(endHour).padStart(2, '0')}:${endMin}:00`,
  };
}

// Pomocnik: zwraca godziny dla rezerwacji, która ZAKOŃCZYŁA SIĘ DZISIAJ.
// Wyznacza ostatni pełny kwadrans (15 min), który już minął:
//   end   = poprzednie pełne :15 (min. 00:15)
//   start = end − 15 min
// Działa poprawnie przez całą dobę (poza 1. kwadransem po północy).
function getPastBookingTimes(): { startTime: string; endTime: string } {
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const endMins   = Math.max(Math.floor(nowMins / 15) * 15 - 15, 15);
  const startMins = endMins - 15;
  const fmt = (m: number) =>
    `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}:00`;
  return { startTime: fmt(startMins), endTime: fmt(endMins) };
}

const TODAY = toLocalDateStr(new Date());

// Test 9 — Pokój pokazuje "Unavailable" gdy ma aktywną rezerwację teraz
test('pokój pokazuje Unavailable gdy trwa aktywna rezerwacja', async ({ page }) => {
  // Utwórz rezerwację na salę 3 (Room 115 – Consultation) trwającą teraz
  const ctx = await playwrightRequest.newContext({ ignoreHTTPSErrors: true });
  const { startTime, endTime } = getCurrentBookingTimes();

  // Anuluj istniejące rezerwacje dla sali 3 na dzisiaj, by uniknąć konfliktu z poprzednimi uruchomieniami
  const existingRes = await ctx.get('https://localhost:7075/api/bookings/my', {
    headers: { 'X-Doctor-Id': 'dr-kowalski' },
  });
  if (existingRes.ok()) {
    const existing = await existingRes.json();
    for (const b of existing.filter((b: { roomId: number; date: string; status: string }) =>
      b.roomId === 3 && b.date === TODAY && b.status !== 'cancelled')) {
      await ctx.delete(`https://localhost:7075/api/bookings/${b.id}`, {
        headers: { 'X-Doctor-Id': 'dr-kowalski' },
      });
    }
  }

  await ctx.post('https://localhost:7075/api/bookings', {
    headers: { 'Content-Type': 'application/json', 'X-Doctor-Id': 'dr-kowalski' },
    data: { roomId: 3, doctorId: 'dr-kowalski', date: TODAY, startTime, endTime },
  });
  await ctx.dispose();

  await loginAs(page, 'dr-kowalski', 'pass123');
  await page.getByTestId('nav-rooms').click();

  // Sala 3 (Room 115) powinna być oznaczona jako Unavailable
  const room115 = page.getByTestId('room-card').filter({ hasText: 'Room 115' });
  await expect(room115).toBeVisible();
  await expect(room115.getByTestId('room-status')).toContainText('Unavailable');

  // Przycisk "Book Room" powinien być wyłączony
  await expect(room115.getByTestId('btn-book')).toBeDisabled();
});

// Test 10 — Rezerwacja trwająca teraz ma status "active"
test('rezerwacja trwająca teraz ma status active', async ({ page }) => {
  // Utwórz rezerwację na salę 4 (Room 302 – Radiology) trwającą teraz
  const ctx = await playwrightRequest.newContext({ ignoreHTTPSErrors: true });
  const { startTime, endTime } = getCurrentBookingTimes();

  // Anuluj istniejące rezerwacje dla sali 4 na dzisiaj, by uniknąć konfliktu z poprzednimi uruchomieniami
  const existingRes = await ctx.get('https://localhost:7075/api/bookings/my', {
    headers: { 'X-Doctor-Id': 'dr-kowalski' },
  });
  if (existingRes.ok()) {
    const existing = await existingRes.json();
    for (const b of existing.filter((b: { roomId: number; date: string; status: string }) =>
      b.roomId === 4 && b.date === TODAY && b.status !== 'cancelled')) {
      await ctx.delete(`https://localhost:7075/api/bookings/${b.id}`, {
        headers: { 'X-Doctor-Id': 'dr-kowalski' },
      });
    }
  }

  await ctx.post('https://localhost:7075/api/bookings', {
    headers: { 'Content-Type': 'application/json', 'X-Doctor-Id': 'dr-kowalski' },
    data: { roomId: 4, doctorId: 'dr-kowalski', date: TODAY, startTime, endTime },
  });
  await ctx.dispose();

  await loginAs(page, 'dr-kowalski', 'pass123');
  await page.getByTestId('nav-my-bookings').click();

  // Rezerwacja Room 302 powinna mieć status "active"
  const activeRow = page.getByTestId('booking-row').filter({ hasText: 'Room 302' });
  await expect(activeRow).toBeVisible();
  await expect(activeRow).toContainText('active');
});

// Test 11 — Rezerwacja zakończona dzisiaj ma status "completed"
test('rezerwacja zakończona dzisiaj ma status completed', async ({ page }) => {
  // Utwórz rezerwację na salę 5 (Room 210 – ICU) która zakończyła się 2h temu
  const ctx = await playwrightRequest.newContext({ ignoreHTTPSErrors: true });
  const { startTime, endTime } = getPastBookingTimes();

  // Anuluj istniejące rezerwacje dla sali 5 na dzisiaj, by uniknąć konfliktu z poprzednimi uruchomieniami
  const existingRes = await ctx.get('https://localhost:7075/api/bookings/my', {
    headers: { 'X-Doctor-Id': 'dr-kowalski' },
  });
  if (existingRes.ok()) {
    const existing = await existingRes.json();
    for (const b of existing.filter((b: { roomId: number; date: string; status: string }) =>
      b.roomId === 5 && b.date === TODAY && b.status !== 'cancelled')) {
      await ctx.delete(`https://localhost:7075/api/bookings/${b.id}`, {
        headers: { 'X-Doctor-Id': 'dr-kowalski' },
      });
    }
  }

  await ctx.post('https://localhost:7075/api/bookings', {
    headers: { 'Content-Type': 'application/json', 'X-Doctor-Id': 'dr-kowalski' },
    data: { roomId: 5, doctorId: 'dr-kowalski', date: TODAY, startTime, endTime },
  });
  await ctx.dispose();

  await loginAs(page, 'dr-kowalski', 'pass123');
  await page.getByTestId('nav-my-bookings').click();

  // Rezerwacja Room 210 powinna mieć status "completed"
  const completedRow = page.getByTestId('booking-row').filter({ hasText: 'Room 210' });
  await expect(completedRow).toBeVisible();
  await expect(completedRow).toContainText('completed');
});
