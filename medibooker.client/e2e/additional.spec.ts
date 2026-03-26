import { test, expect, request as playwrightRequest } from '@playwright/test';
import { loginAs, toLocalDateStr } from './helpers';

function getStatNumber(text: string | null): number {
  return parseInt(text?.match(/\d+/)?.[0] ?? '0', 10);
}

function getCurrentBookingTimes(): { startTime: string; endTime: string } {
  const h = new Date().getHours();
  const endHour = h < 23 ? h + 1 : 23;
  const endMin  = h < 23 ? '00' : '59';
  return {
    startTime: `${String(h).padStart(2, '0')}:00:00`,
    endTime:   `${String(endHour).padStart(2, '0')}:${endMin}:00`,
  };
}

// Test 1 — Wylogowanie użytkownika
test('user can logout successfully', async ({ page }) => {
  await loginAs(page, 'dr-kowalski', 'pass123');
  await expect(page.getByTestId('brand-name')).toBeVisible();

  await page.getByTestId('btn-logout').click();

  // Powinien wrócić do strony logowania
  await expect(page.getByTestId('login-form')).toBeVisible();
  await expect(page.getByTestId('brand-name-login')).toContainText('MediBooker');
});

// Test 2 — Nawigacja między stronami
test('user can navigate between pages using navbar', async ({ page }) => {
  await loginAs(page, 'dr-kowalski', 'pass123');

  // Dashboard domyślnie
  await expect(page.getByTestId('stat-available')).toBeVisible();

  // Rooms
  await page.getByTestId('nav-rooms').click();
  await expect(page.getByTestId('search-rooms')).toBeVisible();

  // My Bookings
  await page.getByTestId('nav-my-bookings').click();
  await expect(page.getByTestId('bookings-table')).toBeVisible();

  // Dashboard ponownie
  await page.getByTestId('nav-dashboard').click();
  await expect(page.getByTestId('stat-available')).toBeVisible();
});

// Test 3 — Statystyki dashboard aktualizują się po rezerwacji
test('dashboard stats update after booking a room', async ({ page }) => {
  await loginAs(page, 'dr-kowalski', 'pass123');

  // Poczekaj na pełne załadowanie danych dashboardu
  await page.waitForLoadState('networkidle');

  // Zapisz początkowe statystyki (My Bookings Today)
  const initialMyBookings = getStatNumber(await page.getByTestId('stat-my-bookings').textContent());

  // Przejdź do Rooms i zarezerwuj salę na dzisiaj
  await page.getByTestId('nav-rooms').click();
  await page.getByTestId('filter-available').click();
  await page.getByTestId('btn-book').first().click();
  await page.getByTestId('input-date').fill(toLocalDateStr(new Date()));
  await expect(page.getByTestId('slots-list')).toBeVisible();
  await page.getByTestId('slot-btn').first().click();
  await page.getByTestId('btn-confirm-booking').click();
  await expect(page.getByTestId('booking-success')).toBeVisible();

  // Poczekaj na zamknięcie modalu
  await page.waitForTimeout(1500);

  // Wróć do Dashboard
  await page.getByTestId('nav-dashboard').click();

  // Statystyki My Bookings Today powinny wzrosnąć o 1
  await expect(page.getByTestId('stat-my-bookings')).toContainText(String(initialMyBookings + 1));
});

// Test 4 — Strona My Bookings pokazuje własne rezerwacje
test('my bookings page shows user own bookings', async ({ page }) => {
  await loginAs(page, 'dr-kowalski', 'pass123');

  await page.getByTestId('nav-my-bookings').click();

  // Sprawdź czy tabela zawiera rezerwacje tylko dla dr-kowalski
  const rows = page.getByTestId('booking-row');
  const count = await rows.count();

  for (let i = 0; i < count; i++) {
    await expect(rows.nth(i)).toContainText('dr-kowalski');
  }
});

// Test 5 — Admin może zobaczyć wszystkie rezerwacje
test('admin can view all bookings in admin panel', async ({ page }) => {
  // Pre-create bookings from two different doctors for today
  const ctx = await playwrightRequest.newContext({ ignoreHTTPSErrors: true });
  const TODAY = toLocalDateStr(new Date());

  // Cleanup + create booking for dr-kowalski (room 2 / Room 203) at 07:00-07:30
  const drKRes = await ctx.get('https://localhost:7075/api/bookings/my', {
    headers: { 'X-Doctor-Id': 'dr-kowalski' },
  });
  if (drKRes.ok()) {
    for (const b of (await drKRes.json()).filter(
      (b: { roomId: number; date: string; status: string }) =>
        b.roomId === 2 && b.date === TODAY && b.status !== 'cancelled'
    )) {
      await ctx.delete(`https://localhost:7075/api/bookings/${b.id}`, {
        headers: { 'X-Doctor-Id': 'dr-kowalski' },
      });
    }
  }
  await ctx.post('https://localhost:7075/api/bookings', {
    headers: { 'Content-Type': 'application/json', 'X-Doctor-Id': 'dr-kowalski' },
    data: { roomId: 2, doctorId: 'dr-kowalski', date: TODAY, startTime: '07:00:00', endTime: '07:30:00' },
  });

  // Cleanup + create booking for dr-smith (room 6 / Room 118) at 07:00-07:30
  const drSRes = await ctx.get('https://localhost:7075/api/bookings/my', {
    headers: { 'X-Doctor-Id': 'dr-smith' },
  });
  if (drSRes.ok()) {
    for (const b of (await drSRes.json()).filter(
      (b: { roomId: number; date: string; status: string }) =>
        b.roomId === 6 && b.date === TODAY && b.status !== 'cancelled'
    )) {
      await ctx.delete(`https://localhost:7075/api/bookings/${b.id}`, {
        headers: { 'X-Doctor-Id': 'dr-smith' },
      });
    }
  }
  await ctx.post('https://localhost:7075/api/bookings', {
    headers: { 'Content-Type': 'application/json', 'X-Doctor-Id': 'dr-smith' },
    data: { roomId: 6, doctorId: 'dr-smith', date: TODAY, startTime: '07:00:00', endTime: '07:30:00' },
  });

  await ctx.dispose();

  await loginAs(page, 'admin', 'admin123');
  await page.getByTestId('nav-admin').click();

  // Sekcja All Reservations powinna być widoczna
  await expect(page.locator('h2').filter({ hasText: 'All Reservations' })).toBeVisible();
  await expect(page.getByTestId('bookings-table')).toBeVisible();

  // Sprawdź czy są rezerwacje od różnych lekarzy
  const rows = page.getByTestId('booking-row');
  const doctors = new Set<string>();
  const count = await rows.count();

  for (let i = 0; i < count; i++) {
    const doctorText = await rows.nth(i).locator('td').nth(1).textContent();
    if (doctorText) doctors.add(doctorText);
  }

  // Powinno być więcej niż jeden lekarz
  expect(doctors.size).toBeGreaterThan(1);
});

// Test 6 — Status sali zmienia się po rezerwacji
test('room status changes to unavailable after booking', async ({ page }) => {
  // Utwórz rezerwację na salę 6 (Room 118) dla aktualnej godziny przez API
  const ctx = await playwrightRequest.newContext({ ignoreHTTPSErrors: true });
  const TODAY = toLocalDateStr(new Date());
  const { startTime, endTime } = getCurrentBookingTimes();

  // Anuluj istniejące rezerwacje dla sali 6 na dzisiaj
  const existingRes = await ctx.get('https://localhost:7075/api/bookings/my', {
    headers: { 'X-Doctor-Id': 'dr-kowalski' },
  });
  if (existingRes.ok()) {
    for (const b of (await existingRes.json()).filter(
      (b: { roomId: number; date: string; status: string }) =>
        b.roomId === 6 && b.date === TODAY && b.status !== 'cancelled'
    )) {
      await ctx.delete(`https://localhost:7075/api/bookings/${b.id}`, {
        headers: { 'X-Doctor-Id': 'dr-kowalski' },
      });
    }
  }

  await ctx.post('https://localhost:7075/api/bookings', {
    headers: { 'Content-Type': 'application/json', 'X-Doctor-Id': 'dr-kowalski' },
    data: { roomId: 6, doctorId: 'dr-kowalski', date: TODAY, startTime, endTime },
  });
  await ctx.dispose();

  await loginAs(page, 'dr-kowalski', 'pass123');
  await page.getByTestId('nav-rooms').click();

  // Sala Room 118 powinna być oznaczona jako Unavailable
  const room118 = page.getByTestId('room-card').filter({ hasText: 'Room 118' });
  await expect(room118).toBeVisible();
  await expect(room118.getByTestId('room-status')).toContainText('Unavailable');
  await expect(room118.getByTestId('btn-book')).toBeDisabled();
});

// Test 7 — Walidacja w modalu rezerwacji (data w przeszłości)
test('booking modal validates date cannot be in the past', async ({ page }) => {
  await loginAs(page, 'dr-kowalski', 'pass123');

  await page.getByTestId('nav-rooms').click();
  await page.getByTestId('filter-available').click();
  await page.getByTestId('btn-book').first().click();
  await expect(page.getByTestId('booking-modal')).toBeVisible();

  // Spróbuj wybrać datę w przeszłości
  const yesterday = toLocalDateStr(new Date(Date.now() - 24 * 60 * 60 * 1000));
  await page.getByTestId('input-date').fill(yesterday);

  // Slotów nie powinno być widocznych dla przeszłej daty
  await expect(page.getByTestId('slots-list')).not.toBeVisible();
  await expect(page.locator('.slots-empty')).toBeVisible();
});

// Test 8 — Rejestracja nowego konta administratora
test('rejestracja nowego konta administratora', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByTestId('login-form')).toBeVisible();

  await page.getByTestId('btn-go-register').click();
  await expect(page.getByTestId('register-form')).toBeVisible();

  const uniqueUsername = `admin-test-${Date.now()}`;
  await page.getByTestId('input-display-name').fill('Admin Testowy');
  await page.getByTestId('input-reg-username').fill(uniqueUsername);
  await page.getByTestId('input-reg-password').fill('admin123');
  await page.getByTestId('select-role').selectOption('Admin');

  await page.getByTestId('btn-register').click();

  // Po rejestracji użytkownik powinien być zalogowany jako admin
  await expect(page.getByTestId('brand-name')).toBeVisible();
  await expect(page.getByTestId('user-name')).toContainText('Admin Testowy');
  await expect(page.getByTestId('user-role')).toContainText('Admin');

  // Sprawdź czy ma dostęp do Admin panelu
  await expect(page.getByTestId('nav-admin')).toBeVisible();
});
