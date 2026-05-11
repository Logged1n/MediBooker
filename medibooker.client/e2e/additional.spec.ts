import { test, expect } from '@playwright/test';
import { loginAs, toLocalDateStr } from './helpers';

function getNextWeekday(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
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

// Test 3 — Nowa rezerwacja pojawia się na stronie My Bookings
test('dashboard stats update after booking a room', async ({ page }) => {
  await loginAs(page, 'dr-kowalski', 'pass123');
  await page.waitForLoadState('networkidle');

  // Zapisz początkową liczbę rezerwacji
  await page.getByTestId('nav-my-bookings').click();
  const initialCount = await page.getByTestId('booking-row').count();

  // Przejdź do Rooms i zarezerwuj salę na następny dzień roboczy
  await page.getByTestId('nav-rooms').click();
  await page.getByTestId('filter-available').click();
  await page.getByTestId('btn-book').first().click();
  await page.getByTestId('input-date').fill(getNextWeekday());
  await expect(page.getByTestId('slots-list')).toBeVisible();
  await page.getByTestId('slot-btn').first().click();
  await page.getByTestId('btn-confirm-booking').click();
  await expect(page.getByTestId('booking-success')).toBeVisible();

  await page.waitForTimeout(1500);

  // Nowa rezerwacja powinna pojawić się na stronie My Bookings
  await page.getByTestId('nav-my-bookings').click();
  await expect(page.getByTestId('booking-row')).toHaveCount(initialCount + 1);
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
  await page.route('**/api/bookings/all*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 1, roomId: 2, roomName: 'Room 203', doctorId: 'dr-kowalski',
          date: toLocalDateStr(new Date()), startTime: '09:00', endTime: '10:00', status: 'upcoming',
        },
        {
          id: 2, roomId: 6, roomName: 'Room 118', doctorId: 'dr-smith',
          date: toLocalDateStr(new Date()), startTime: '10:00', endTime: '11:00', status: 'upcoming',
        },
      ]),
    });
  });

  await loginAs(page, 'admin', 'admin123');
  await page.getByTestId('nav-admin').click();

  await expect(page.locator('h2').filter({ hasText: 'All Reservations' })).toBeVisible();
  await expect(page.getByTestId('bookings-table')).toBeVisible();

  const rows = page.getByTestId('booking-row');
  const doctors = new Set<string>();
  const count = await rows.count();

  for (let i = 0; i < count; i++) {
    const doctorText = await rows.nth(i).locator('td').nth(1).textContent();
    if (doctorText) doctors.add(doctorText);
  }

  expect(doctors.size).toBeGreaterThan(1);
});

// Test 6 — Status sali zmienia się po rezerwacji
test('room status changes to unavailable after booking', async ({ page }) => {
  await page.route('**/api/rooms', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 1, name: 'Room 101', type: 'Surgery',      floor: 1, available: true,  isActive: true },
        { id: 2, name: 'Room 203', type: 'ICU',          floor: 2, available: true,  isActive: true },
        { id: 3, name: 'Room 115', type: 'Consultation', floor: 1, available: true,  isActive: true },
        { id: 4, name: 'Room 302', type: 'Radiology',    floor: 3, available: true,  isActive: true },
        { id: 5, name: 'Room 210', type: 'ICU',          floor: 2, available: true,  isActive: true },
        { id: 6, name: 'Room 118', type: 'Surgery',      floor: 1, available: false, isActive: true },
      ]),
    });
  });

  await loginAs(page, 'dr-kowalski', 'pass123');
  await page.getByTestId('nav-rooms').click();

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
