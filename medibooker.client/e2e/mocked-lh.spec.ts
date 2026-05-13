import { test, expect } from '@playwright/test';
import { loginAs, toLocalDateStr } from './helpers';

// ============================================================
// Testy z mockowaniem danych (page.route()) — Łukasz Halicki
// ============================================================

// ------------------------------------------------------------
// Test LH1 — Numer piętra wyświetlany na karcie sali
// Przypadek testowy: TC-ROOMS-FLOOR-DISPLAY-01
// Opis: Karta sali na stronie Rooms powinna wyświetlać numer piętra
//       zwrócony przez API. Mockujemy /api/rooms z unikalnymi
//       numerami pięter, żeby zweryfikować że UI poprawnie
//       renderuje to pole dla każdej sali.
// Autor: Łukasz Halicki
// ------------------------------------------------------------
test('karta sali wyświetla numer piętra zwrócony przez zmockowane API', async ({ page }) => {
  await page.route('**/api/rooms', async (route) => {
    if (route.request().method() !== 'GET') return route.continue();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 1, name: 'Room 101', type: 'Consultation', floor: 1, available: true, isActive: true },
        { id: 2, name: 'Room 205', type: 'Surgery',      floor: 2, available: true, isActive: true },
        { id: 3, name: 'Room 307', type: 'ICU',          floor: 3, available: true, isActive: true },
      ]),
    });
  });

  await loginAs(page, 'dr-kowalski', 'pass123');
  await page.getByTestId('nav-rooms').click();
  await page.waitForLoadState('networkidle');

  await expect(page.getByTestId('room-card')).toHaveCount(3);

  // Każda karta wyświetla numer piętra pasujący do danych z API
  await expect(page.getByTestId('room-card').filter({ hasText: 'Room 101' })).toContainText('1');
  await expect(page.getByTestId('room-card').filter({ hasText: 'Room 205' })).toContainText('2');
  await expect(page.getByTestId('room-card').filter({ hasText: 'Room 307' })).toContainText('3');
});

// ------------------------------------------------------------
// Test LH2 — Tabela My Bookings wyświetla godziny rezerwacji z API
// Przypadek testowy: TC-MYBOOKINGS-TIME-DISPLAY-01
// Opis: Każdy wiersz na stronie My Bookings powinien wyświetlać
//       godzinę startową i końcową rezerwacji. Mockujemy endpoint
//       /api/bookings/my z konkretnymi wartościami czasowymi,
//       żeby zweryfikować poprawność renderowania bez zależności
//       od danych w bazie.
// Autor: Łukasz Halicki
// ------------------------------------------------------------
test('tabela My Bookings wyświetla godziny startową i końcową rezerwacji', async ({ page }) => {
  await page.route('**/api/bookings/my', async (route) => {
    if (route.request().method() !== 'GET') return route.continue();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 20, roomId: 1, roomName: 'Room 101', doctorId: 'dr-kowalski',
          date: toLocalDateStr(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)),
          startTime: '08:00', endTime: '09:30', status: 'upcoming',
        },
        {
          id: 21, roomId: 2, roomName: 'Room 202', doctorId: 'dr-kowalski',
          date: toLocalDateStr(new Date(Date.now() + 4 * 24 * 60 * 60 * 1000)),
          startTime: '14:00', endTime: '15:00', status: 'upcoming',
        },
      ]),
    });
  });

  await loginAs(page, 'dr-kowalski', 'pass123');
  await page.getByTestId('nav-my-bookings').click();
  await page.waitForLoadState('networkidle');

  const rows = page.getByTestId('booking-row');
  await expect(rows).toHaveCount(2);

  // Pierwszy wiersz zawiera godziny 08:00 i 09:30
  const firstRow = rows.filter({ hasText: 'Room 101' });
  await expect(firstRow).toContainText('08:00');
  await expect(firstRow).toContainText('09:30');

  // Drugi wiersz zawiera godziny 14:00 i 15:00
  const secondRow = rows.filter({ hasText: 'Room 202' });
  await expect(secondRow).toContainText('14:00');
  await expect(secondRow).toContainText('15:00');
});

// ------------------------------------------------------------
// Test LH3 — Modal rezerwacji zamyka się automatycznie po sukcesie
// Przypadek testowy: TC-BOOK-SUCCESS-CLOSE-01
// Opis: Po pomyślnym wysłaniu rezerwacji (201 Created) modal powinien
//       wyświetlić komunikat sukcesu i automatycznie się zamknąć.
//       Mockujemy cały przepływ (sala → sloty → POST rezerwacji),
//       żeby zweryfikować zachowanie UI po potwierdzeniu — niezależnie
//       od stanu bazy.
// Autor: Łukasz Halicki
// ------------------------------------------------------------
test('modal rezerwacji zamyka się automatycznie i pokazuje sukces po potwierdzeniu', async ({ page }) => {
  await page.route('**/api/rooms', async (route) => {
    if (route.request().method() !== 'GET') return route.continue();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 4, name: 'Room 404', type: 'Surgery', floor: 2, available: true, isActive: true },
      ]),
    });
  });

  await page.route('**/api/rooms/4/available-slots**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { start: '10:00', end: '11:00' },
        { start: '12:00', end: '13:00' },
      ]),
    });
  });

  await page.route('**/api/bookings', async (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 99, roomId: 4, roomName: 'Room 404', doctorId: 'dr-kowalski',
        date: toLocalDateStr(new Date(Date.now() + 24 * 60 * 60 * 1000)),
        startTime: '10:00', endTime: '11:00', status: 'upcoming',
      }),
    });
  });

  await loginAs(page, 'dr-kowalski', 'pass123');
  await page.getByTestId('nav-rooms').click();

  await page.getByTestId('btn-book').first().click();
  await expect(page.getByTestId('booking-modal')).toBeVisible();

  const tomorrow = toLocalDateStr(new Date(Date.now() + 24 * 60 * 60 * 1000));
  await page.getByTestId('input-date').fill(tomorrow);
  await expect(page.getByTestId('slots-list')).toBeVisible();
  await page.getByTestId('slot-btn').first().click();
  await page.getByTestId('btn-confirm-booking').click();

  // Komunikat sukcesu powinien być widoczny
  await expect(page.getByTestId('booking-success')).toBeVisible();
  await expect(page.getByTestId('booking-success')).toContainText('Booking confirmed');

  // Modal powinien się automatycznie zamknąć
  await expect(page.getByTestId('booking-modal')).not.toBeVisible({ timeout: 5000 });
});
