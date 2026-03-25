import { test, expect, request as playwrightRequest } from '@playwright/test';
import { getTomorrow, toLocalDateStr, loginAs } from './helpers';

// Test 4 — Pomyślna rezerwacja aktywnej sali
test('lekarz może pomyślnie zarezerwować aktywną salę', async ({ page }) => {
  await loginAs(page, 'dr-kowalski', 'pass123');

  await page.getByTestId('nav-rooms').click();
  await page.getByTestId('filter-available').click();

  // Kliknij "Book Room" dla pierwszej dostępnej sali
  await page.getByTestId('btn-book').first().click();
  await expect(page.getByTestId('booking-modal')).toBeVisible();

  // Wybierz jutrzejszą datę
  await page.getByTestId('input-date').fill(getTomorrow());

  // Poczekaj na załadowanie slotów i kliknij pierwszy
  await expect(page.getByTestId('slots-list')).toBeVisible();
  await page.getByTestId('slot-btn').first().click();

  // Potwierdź rezerwację
  await page.getByTestId('btn-confirm-booking').click();

  // Potwierdzenie powinno być widoczne
  await expect(page.getByTestId('booking-success')).toBeVisible();
  await expect(page.getByTestId('booking-success')).toContainText('Booking confirmed');
});

// Test 5 — Blokada podwójnej rezerwacji tej samej sali
test('system blokuje podwójną rezerwację tej samej sali w pokrywającym się przedziale', async ({ page }) => {
  await loginAs(page, 'dr-kowalski', 'pass123');

  await page.getByTestId('nav-rooms').click();
  await page.getByTestId('filter-available').click();

  // Pierwsza rezerwacja
  await page.getByTestId('btn-book').first().click();
  await page.getByTestId('input-date').fill(getTomorrow());
  await expect(page.getByTestId('slots-list')).toBeVisible();

  // Kliknij slot drugi (indeks 1) żeby mieć znany przedział
  const firstSlotText = await page.getByTestId('slot-btn').first().textContent();
  await page.getByTestId('slot-btn').first().click();
  await page.getByTestId('btn-confirm-booking').click();
  await expect(page.getByTestId('booking-success')).toBeVisible();

  // Poczekaj na zamknięcie modalu (auto-close 1.2s)
  await page.waitForTimeout(1500);

  // Spróbuj zarezerwować tę samą salę, ręcznie wpisując pokrywający się czas
  await page.getByTestId('btn-book').first().click();
  await page.getByTestId('input-date').fill(getTomorrow());

  // Wyodrębnij godzinę startową z pierwszego slotu (format "HH:MM - HH:MM")
  const startTime = firstSlotText?.split(' - ')[0].trim() ?? '09:00';
  const [h, m] = startTime.split(':').map(Number);
  const overlapStart = `${String(h).padStart(2, '0')}:${String(m + 30).padStart(2, '0')}`;
  const overlapEnd = `${String(h + 1).padStart(2, '0')}:${String(m + 30).padStart(2, '0')}`;

  await page.getByTestId('input-time-from').fill(overlapStart);
  await page.getByTestId('input-time-to').fill(overlapEnd);
  await page.getByTestId('btn-confirm-booking').click();

  // System powinien zwrócić błąd konfliktu
  await expect(page.getByTestId('booking-error')).toBeVisible();
  await expect(page.getByTestId('booking-error')).toContainText('already booked');
});

// Test 6 — Dostępne sloty widoczne po wybraniu daty
test('modal rezerwacji wyświetla dostępne sloty po wybraniu daty', async ({ page }) => {
  await loginAs(page, 'dr-kowalski', 'pass123');

  await page.getByTestId('nav-rooms').click();
  await page.getByTestId('filter-available').click();
  await page.getByTestId('btn-book').first().click();
  await expect(page.getByTestId('booking-modal')).toBeVisible();

  // Przed wybraniem daty sloty nie są widoczne
  await expect(page.getByTestId('slots-list')).not.toBeVisible();

  // Po wybraniu daty sloty się pojawiają
  await page.getByTestId('input-date').fill(getTomorrow());
  await expect(page.getByTestId('slots-list')).toBeVisible();

  const slotCount = await page.getByTestId('slot-btn').count();
  expect(slotCount).toBeGreaterThan(0);
});

// Test 7 — Lekarz nie może anulować rezerwacji innego lekarza
test('lekarz nie może anulować rezerwacji należącej do innego lekarza', async () => {
  const ctx = await playwrightRequest.newContext({ ignoreHTTPSErrors: true });

  // 1. Utwórz rezerwację jako dr-smith — unikalna data (7 dni + bieżące sekundy jako offset godziny)
  //    Zapobiega konfliktom gdy serwer jest reużywany między uruchomieniami testów
  const d = new Date();
  d.setDate(d.getDate() + 7);
  const futureDate = toLocalDateStr(d);
  const startHour = 8 + (new Date().getSeconds() % 9); // losowa godzina 8-16
  const startTime = `${String(startHour).padStart(2, '0')}:00:00`;
  const endTime   = `${String(startHour + 1).padStart(2, '0')}:00:00`;

  // Anuluj istniejące rezerwacje dr-smitha dla sali 2 w tym dniu, aby uniknąć konfliktu
  const existingRes = await ctx.get('https://localhost:7075/api/bookings/my', {
    headers: { 'X-Doctor-Id': 'dr-smith' },
  });
  if (existingRes.ok()) {
    const existing = await existingRes.json();
    const conflicts = existing.filter(
      (b: { roomId: number; date: string; status: string }) =>
        b.roomId === 2 && b.date === futureDate && b.status !== 'cancelled'
    );
    for (const b of conflicts) {
      await ctx.delete(`https://localhost:7075/api/bookings/${b.id}`, {
        headers: { 'X-Doctor-Id': 'dr-smith' },
      });
    }
  }

  const createRes = await ctx.post('https://localhost:7075/api/bookings', {
    headers: { 'Content-Type': 'application/json', 'X-Doctor-Id': 'dr-smith' },
    data: {
      roomId: 2,
      doctorId: 'dr-smith',
      date: futureDate,
      startTime,
      endTime,
    },
  });
  expect(createRes.ok()).toBeTruthy();
  const booking = await createRes.json();

  // 2. Zaloguj jako dr-kowalski i pobierz jego token JWT
  const loginRes = await ctx.post('https://localhost:7075/api/auth/login', {
    data: { username: 'dr-kowalski', password: 'pass123' },
  });
  expect(loginRes.ok()).toBeTruthy();
  const { token } = await loginRes.json();

  // 3. Spróbuj anulować rezerwację dr-smitha jako dr-kowalski (przez API z JWT)
  const cancelRes = await ctx.delete(`https://localhost:7075/api/bookings/${booking.id}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });

  // Backend powinien zwrócić 403 Forbidden
  expect(cancelRes.status()).toBe(403);

  // 4. Rezerwacja nadal istnieje i ma status upcoming
  // Weryfikacja przez dr-smith: jego booking nadal upcoming
  const smithLoginRes = await ctx.post('https://localhost:7075/api/auth/login', {
    data: { username: 'dr-smith', password: 'pass123' },
  });
  const { token: smithToken } = await smithLoginRes.json();
  const smithBookingsRes = await ctx.get('https://localhost:7075/api/bookings/my', {
    headers: { 'Authorization': `Bearer ${smithToken}` },
  });
  const smithBookings = await smithBookingsRes.json();
  const targetBooking = smithBookings.find((b: { id: number }) => b.id === booking.id);
  expect(targetBooking).toBeDefined();
  expect(targetBooking.status).toBe('upcoming');

  await ctx.dispose();
});

// Test 8 — Anulowanie własnej rezerwacji
test('lekarz może anulować własną rezerwację', async ({ page }) => {
  await loginAs(page, 'dr-kowalski', 'pass123');

  // Utwórz rezerwację
  await page.getByTestId('nav-rooms').click();
  await page.getByTestId('filter-available').click();
  await page.getByTestId('btn-book').first().click();
  await page.getByTestId('input-date').fill(getTomorrow());
  await expect(page.getByTestId('slots-list')).toBeVisible();

  // Wybierz ostatni dostępny slot (zmniejsza ryzyko konfliktu z innymi testami)
  const slotCount = await page.getByTestId('slot-btn').count();
  await page.getByTestId('slot-btn').nth(slotCount - 1).click();
  await page.getByTestId('btn-confirm-booking').click();
  await expect(page.getByTestId('booking-success')).toBeVisible();

  // Poczekaj na zamknięcie modalu
  await page.waitForTimeout(1500);

  // Przejdź do My Bookings
  await page.getByTestId('nav-my-bookings').click();

  const rows = page.getByTestId('booking-row');
  await expect(rows.first()).toBeVisible();

  // Znajdź pierwsze upcoming booking i zapamiętaj jego numer wiersza w tabeli
  const upcomingRow = rows.filter({ hasText: 'upcoming' }).first();
  await expect(upcomingRow.getByTestId('btn-cancel')).toBeVisible();
  await upcomingRow.getByTestId('btn-cancel').click();

  // Po anulowaniu przycisk Cancel powinien zniknąć dla tego wiersza
  // i status powinien zostać zaktualizowany na 'cancelled'
  await expect(page.getByTestId('booking-row').filter({ hasText: 'cancelled' }).first()).toBeVisible();
});
