import { test, expect } from '@playwright/test';
import { loginAs } from './helpers';

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

  // Zapisz początkowe statystyki
  const initialAvailable = await page.getByTestId('stat-available').textContent();
  const initialOccupied = await page.getByTestId('stat-occupied').textContent();

  // Przejdź do Rooms i zarezerwuj salę na dzisiaj
  await page.getByTestId('nav-rooms').click();
  await page.getByTestId('filter-available').click();
  await page.getByTestId('btn-book').first().click();
  await page.getByTestId('input-date').fill(new Date().toISOString().split('T')[0]);
  await expect(page.getByTestId('slots-list')).toBeVisible();
  await page.getByTestId('slot-btn').first().click();
  await page.getByTestId('btn-confirm-booking').click();
  await expect(page.getByTestId('booking-success')).toBeVisible();

  // Poczekaj na zamknięcie modalu
  await page.waitForTimeout(1500);

  // Wróć do Dashboard
  await page.getByTestId('nav-dashboard').click();

  // Statystyki powinny się zaktualizować (available -1, occupied +1)
  const newAvailable = await page.getByTestId('stat-available').textContent();
  const newOccupied = await page.getByTestId('stat-occupied').textContent();

  expect(parseInt(newAvailable!)).toBe(parseInt(initialAvailable!) - 1);
  expect(parseInt(newOccupied!)).toBe(parseInt(initialOccupied!) + 1);
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
  await loginAs(page, 'dr-kowalski', 'pass123');

  await page.getByTestId('nav-rooms').click();
  await page.getByTestId('filter-available').click();

  // Znajdź pierwszą dostępną salę
  const firstRoom = page.getByTestId('room-card').first();
  const roomName = await firstRoom.locator('.room-name').textContent();
  await expect(firstRoom.getByTestId('room-status')).toContainText('Available');

  // Zarezerwuj ją
  await firstRoom.getByTestId('btn-book').click();
  await page.getByTestId('input-date').fill(new Date().toISOString().split('T')[0]);
  await expect(page.getByTestId('slots-list')).toBeVisible();
  await page.getByTestId('slot-btn').first().click();
  await page.getByTestId('btn-confirm-booking').click();
  await expect(page.getByTestId('booking-success')).toBeVisible();

  // Poczekaj na zamknięcie modalu
  await page.waitForTimeout(1500);

  // Odśwież stronę lub przejdź ponownie do Rooms
  await page.reload();
  await loginAs(page, 'dr-kowalski', 'pass123');
  await page.getByTestId('nav-rooms').click();

  // Sala powinna być teraz Unavailable
  const roomCard = page.getByTestId('room-card').filter({ hasText: roomName! });
  await expect(roomCard.getByTestId('room-status')).toContainText('Unavailable');
  await expect(roomCard.getByTestId('btn-book')).toBeDisabled();
});

// Test 7 — Walidacja w modalu rezerwacji (data w przeszłości)
test('booking modal validates date cannot be in the past', async ({ page }) => {
  await loginAs(page, 'dr-kowalski', 'pass123');

  await page.getByTestId('nav-rooms').click();
  await page.getByTestId('btn-book').first().click();
  await expect(page.getByTestId('booking-modal')).toBeVisible();

  // Spróbuj wybrać datę w przeszłości
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
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