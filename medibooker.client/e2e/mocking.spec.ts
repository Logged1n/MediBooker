import { test, expect } from '@playwright/test';
import { loginAs } from './helpers';
import { loginAs, getTomorrow } from './helpers';

// ============================================================
// Testy z mockowaniem danych (page.route())
// Izolacja frontendu od backendu — kontrolowane odpowiedzi API
// ============================================================
test('rooms page renders mocked room inventory returned by the API', async ({ page }) => {
  await page.route('**/api/rooms', (route) => {
    if (route.request().method() !== 'GET') {
      return route.continue();
    }

// ------------------------------------------------------------
// Test M4 — Anulowane rezerwacje nie mają przycisku Cancel
// Przypadek testowy: TC-MYBOOKINGS-STATUS-01
// Opis: Strona "My Bookings" powinna wyświetlać przycisk Cancel
//       tylko dla rezerwacji o statusie upcoming lub active.
//       Mockujemy /api/bookings/my, żeby wymusić różne statusy
//       i zweryfikować, że UI poprawnie je obsługuje.
// ------------------------------------------------------------
test('strona My Bookings nie wyświetla przycisku Cancel dla anulowanych i zakończonych rezerwacji', async ({ page }) => {
  await page.route('**/api/bookings/my', async (route) => {
    await route.fulfill({
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 1, roomId: 1, roomName: 'Room 101', doctorId: 'dr-kowalski',
          date: '2026-05-20', startTime: '09:00', endTime: '10:00', status: 'upcoming',
        },
        {
          id: 2, roomId: 2, roomName: 'Room 202', doctorId: 'dr-kowalski',
          date: '2026-05-01', startTime: '11:00', endTime: '12:00', status: 'completed',
        },
        {
          id: 3, roomId: 3, roomName: 'Room 303', doctorId: 'dr-kowalski',
          date: '2026-04-20', startTime: '14:00', endTime: '15:00', status: 'cancelled',
        },
        { id: 1, name: 'Room Alpha', type: 'Consultation', floor: 1, available: true, isActive: true },
        { id: 2, name: 'Room Beta', type: 'Surgery', floor: 2, available: false, isActive: true },
        { id: 3, name: 'Room Gamma', type: 'ICU', floor: 3, available: true, isActive: true },
      ]),
    });
  });

  await loginAs(page, 'dr-kowalski', 'pass123');
  await page.getByTestId('nav-my-bookings').click();
  await page.waitForLoadState('networkidle');
  await page.getByTestId('nav-rooms').click();

  const rows = page.getByTestId('booking-row');
  await expect(rows).toHaveCount(3);
  await expect(page.getByTestId('room-card')).toHaveCount(3);
  await expect(page.getByTestId('room-card').filter({ hasText: 'Room Alpha' }).getByTestId('room-status')).toContainText('Available');
  await expect(page.getByTestId('room-card').filter({ hasText: 'Room Beta' }).getByTestId('room-status')).toContainText('Unavailable');
  await expect(page.getByTestId('room-card').filter({ hasText: 'Room Gamma' }).getByTestId('room-status')).toContainText('Available');
});

  // Wiersz upcoming ma przycisk Cancel
  const upcomingRow = rows.filter({ hasText: 'upcoming' });
  await expect(upcomingRow.getByTestId('btn-cancel')).toBeVisible();
test('booking modal shows generic server error when booking API returns 500', async ({ page }) => {
  await page.route('**/api/rooms', (route) => {
    if (route.request().method() !== 'GET') {
      return route.continue();
    }

  // Wiersz completed NIE ma przycisku Cancel
  const completedRow = rows.filter({ hasText: 'completed' });
  await expect(completedRow.getByTestId('btn-cancel')).toHaveCount(0);

  // Wiersz cancelled NIE ma przycisku Cancel
  const cancelledRow = rows.filter({ hasText: 'cancelled' });
  await expect(cancelledRow.getByTestId('btn-cancel')).toHaveCount(0);
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 1, name: 'Room Omega', type: 'Consultation', floor: 2, available: true, isActive: true },
      ]),
});
  });

// ------------------------------------------------------------
// Test M5 — Modal rezerwacji pokazuje "No available slots" gdy API zwraca []
// Przypadek testowy: TC-BOOK-EMPTY-SLOTS-01
// Opis: Gdy /api/rooms/{id}/available-slots zwróci pustą tablicę,
//       modal rezerwacji powinien wyświetlić informację, że brak
//       dostępnych slotów. Mockujemy endpoint slotów, żeby
//       przetestować ten komunikat.
// ------------------------------------------------------------
test('modal rezerwacji wyświetla komunikat braku slotów gdy API zwraca pustą tablicę', async ({ page }) => {
  await page.route('**/api/rooms', async (route) => {
    await route.fulfill({
  await page.route('**/api/rooms/1/available-slots**', (route) => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 7, name: 'Room 701', type: 'Consultation', floor: 1, available: true, isActive: true },
        { start: '09:00', end: '10:00' },
        { start: '11:00', end: '12:00' },
      ]),
    });
  });

  await page.route('**/api/rooms/7/available-slots*', async (route) => {
    await route.fulfill({
      status: 200,
  await page.route('**/api/bookings', async (route) => {
    if (route.request().method() !== 'POST') {
      return route.continue();
    }

    return route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify([]),
      body: JSON.stringify({ message: 'Unexpected server error. Please try again later.' }),
    });
  });

  await loginAs(page, 'dr-kowalski', 'pass123');
  await page.getByTestId('nav-rooms').click();

  await page.getByTestId('btn-book').first().click();
  await expect(page.getByTestId('booking-modal')).toBeVisible();
  const bookButton = page.getByTestId('btn-book').first();
  await expect(bookButton).toBeVisible();
  await bookButton.click();

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
  await page.getByTestId('input-date').fill(tomorrowStr);
  await page.getByTestId('input-date').fill(getTomorrow());
  await expect(page.getByTestId('slots-list')).toBeVisible();
  await page.getByTestId('slot-btn').first().click();

  await expect(page.locator('.slots-empty')).toBeVisible();
  await expect(page.locator('.slots-empty')).toContainText('No available slots for this date');
  await page.getByTestId('btn-confirm-booking').click();
  await expect(page.getByTestId('booking-error')).toBeVisible();
  await expect(page.getByTestId('booking-error')).toContainText('Unexpected server error');
});

// ------------------------------------------------------------
// Test M6 — Filtr typów sal działa poprawnie z zmockowanymi danymi
// Przypadek testowy: TC-ROOMS-FILTER-TYPE-01
// Opis: Filtr "Type" na stronie Rooms powinien wyświetlać tylko
//       sale pasujące do wybranego typu. Mockujemy /api/rooms,
//       żeby mieć kontrolę nad dostępnymi typami i weryfikować
//       logikę filtrowania niezależnie od stanu bazy.
// ------------------------------------------------------------
test('filtr typów sal na stronie Rooms wyświetla tylko sale wybranego typu', async ({ page }) => {
  await page.route('**/api/rooms', async (route) => {
    await route.fulfill({
test('my bookings page displays empty state when backend returns no bookings', async ({ page }) => {
  await page.route('**/api/bookings/my', (route) => {
    if (route.request().method() !== 'GET') {
      return route.continue();
    }

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 1, name: 'Room 101', type: 'Surgery',      floor: 1, available: true,  isActive: true },
        { id: 2, name: 'Room 102', type: 'Surgery',      floor: 2, available: false, isActive: true },
        { id: 3, name: 'Room 201', type: 'Consultation', floor: 2, available: true,  isActive: true },
        { id: 4, name: 'Room 301', type: 'ICU',          floor: 3, available: true,  isActive: true },
      ]),
      body: JSON.stringify([]),
    });
  });

  await loginAs(page, 'dr-kowalski', 'pass123');
  await page.getByTestId('nav-rooms').click();
  await page.waitForLoadState('networkidle');

  // Przed filtrowaniem: wszystkie 4 sale widoczne
  await expect(page.getByTestId('room-card')).toHaveCount(4);

  // Wybierz typ "Surgery"
  await page.getByTestId('filter-type').selectOption('Surgery');

  // Po filtrowaniu: tylko 2 sale Surgery
  await expect(page.getByTestId('room-card')).toHaveCount(2);
  const cards = page.getByTestId('room-card');
  await expect(cards.nth(0)).toContainText('Room 101');
  await expect(cards.nth(1)).toContainText('Room 102');
  await page.getByTestId('nav-my-bookings').click();

  // Przełącz na typ "ICU"
  await page.getByTestId('filter-type').selectOption('ICU');
  await expect(page.getByTestId('room-card')).toHaveCount(1);
  await expect(page.getByTestId('room-card').first()).toContainText('Room 301');
  await expect(page.getByTestId('bookings-table')).toBeVisible();
  await expect(page.locator('text=No bookings found.')).toBeVisible();
});