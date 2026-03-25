import { test, expect, request as playwrightRequest } from '@playwright/test';
import { loginAs } from './helpers';

// Pomocnik: zwraca godziny dla rezerwacji trwającej teraz (od 1h temu do 1h od teraz)
function getCurrentBookingTimes(): { startTime: string; endTime: string } {
  const now = new Date();
  const start = new Date(now.getTime() - 60 * 60 * 1000); // 1h temu
  const end   = new Date(now.getTime() + 60 * 60 * 1000); // 1h od teraz
  const fmt = (d: Date) =>
    `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:00`;
  return { startTime: fmt(start), endTime: fmt(end) };
}

// Pomocnik: zwraca godziny dla rezerwacji, która już się zakończyła (2-3h temu)
function getPastBookingTimes(): { startTime: string; endTime: string } {
  const now = new Date();
  const start = new Date(now.getTime() - 3 * 60 * 60 * 1000); // 3h temu
  const end   = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2h temu
  const fmt = (d: Date) =>
    `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:00`;
  return { startTime: fmt(start), endTime: fmt(end) };
}

const TODAY = new Date().toISOString().split('T')[0];

// Test 9 — Pokój pokazuje "Unavailable" gdy ma aktywną rezerwację teraz
test('pokój pokazuje Unavailable gdy trwa aktywna rezerwacja', async ({ page }) => {
  // Utwórz rezerwację na salę 3 (Room 115 – Consultation) trwającą teraz
  const ctx = await playwrightRequest.newContext({ ignoreHTTPSErrors: true });
  const { startTime, endTime } = getCurrentBookingTimes();

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
