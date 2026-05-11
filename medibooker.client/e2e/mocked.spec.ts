import { test, expect } from '@playwright/test';
import { loginAs } from './helpers';

// ============================================================
// Testy z mockowaniem danych (page.route())
// Patryk Zadykowicz
// ============================================================

// ------------------------------------------------------------
// Test M1 — Dashboard wyświetla poprawne liczby ze zmockowanych danych
// Przypadek testowy: TC-DASH-01
// Opis: Po zalogowaniu dashboard powinien wyświetlić statystyki
//       obliczone na podstawie danych zwróconych przez /api/rooms
//       i /api/bookings/all. Mockujemy oba endpointy, żeby
//       uniezależnić test od stanu bazy i zweryfikować,
//       że UI poprawnie przelicza i wyświetla liczby.
// ------------------------------------------------------------
test('dashboard wyświetla poprawne statystyki na podstawie zmockowanych sal i rezerwacji', async ({ page }) => {
  // Mockujemy listę sal: 3 sale, z czego 2 dostępne
  await page.route('**/api/rooms', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 1, name: 'Room 101', type: 'Consultation', floor: 1, available: true,  isActive: true },
        { id: 2, name: 'Room 102', type: 'Surgery',      floor: 1, available: true,  isActive: true },
        { id: 3, name: 'Room 103', type: 'ICU',          floor: 2, available: false, isActive: true },
      ]),
    });
  });

  // Mockujemy dzisiejsze rezerwacje: 1 rezerwacja należąca do dr-kowalski
  await page.route('**/api/bookings/all*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 10,
          roomId: 3,
          roomName: 'Room 103',
          doctorId: 'dr-kowalski',
          date: new Date().toISOString().slice(0, 10),
          startTime: '09:00:00',
          endTime: '10:00:00',
          status: 'confirmed',
        },
      ]),
    });
  });

  await loginAs(page, 'dr-kowalski', 'pass123');
  await page.waitForLoadState('networkidle');

  // Łączna liczba sal: 3
  await expect(page.getByTestId('stat-total')).toContainText('3');

  // Dostępne sale: 2
  await expect(page.getByTestId('stat-available')).toContainText('2');

  // Moje rezerwacje dziś: 1 (dr-kowalski ma 1 rezerwację w mocku)
  await expect(page.getByTestId('stat-my-bookings')).toContainText('1');
});

// ------------------------------------------------------------
// Test M2 — Błąd serwera przy tworzeniu rezerwacji wyświetla komunikat
// Przypadek testowy: TC-BOOK-ERR-01
// Opis: Gdy serwer zwróci błąd 409 (konflikt) przy próbie utworzenia
//       rezerwacji, aplikacja powinna wyświetlić komunikat błędu
//       w modalu rezerwacji. Mockujemy POST /api/bookings, żeby
//       przetestować obsługę błędu bez potrzeby ręcznego tworzenia
//       konfliktu w bazie.
// ------------------------------------------------------------
test('modal rezerwacji wyświetla komunikat błędu gdy serwer zwróci konflikt 409', async ({ page }) => {
  // Mockujemy listę sal — jedna dostępna sala
  await page.route('**/api/rooms', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 5, name: 'Room 205', type: 'Consultation', floor: 2, available: true, isActive: true },
      ]),
    });
  });

  // Mockujemy dostępne sloty dla tej sali
  await page.route('**/api/rooms/5/available-slots*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { start: '10:00', end: '11:00' },
        { start: '11:00', end: '12:00' },
      ]),
    });
  });

  // Mockujemy POST rezerwacji — serwer zwraca 409 Conflict
  await page.route('**/api/bookings', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Room is already booked for the selected time slot.' }),
      });
    } else {
      await route.continue();
    }
  });

  await loginAs(page, 'dr-kowalski', 'pass123');

  // Przejdź do listy sal i otwórz modal
  await page.getByTestId('nav-rooms').click();
  await page.getByTestId('btn-book').first().click();
  await expect(page.getByTestId('booking-modal')).toBeVisible();

  // Wybierz jutrzejszą datę i kliknij pierwszy slot
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
  await page.getByTestId('input-date').fill(tomorrowStr);
  await expect(page.getByTestId('slots-list')).toBeVisible();
  await page.getByTestId('slot-btn').first().click();

  // Potwierdź rezerwację — serwer zwróci 409
  await page.getByTestId('btn-confirm-booking').click();

  // Aplikacja powinna wyświetlić komunikat błędu w modalu
  await expect(page.getByTestId('booking-error')).toBeVisible();
  await expect(page.getByTestId('booking-error')).toContainText('already booked');
});

// ------------------------------------------------------------
// Test M3 — Strona Rooms wyświetla puste wyniki gdy API zwróci pustą listę
// Przypadek testowy: TC-ROOMS-EMPTY-01
// Opis: Gdy /api/rooms zwróci pustą tablicę (np. żadna sala nie
//       spełnia kryteriów lub baza jest pusta), strona Rooms powinna
//       wyświetlić komunikat „No rooms match your search criteria"
//       zamiast pustej siatki. Mockujemy endpoint, żeby wymusić
//       ten scenariusz bez manipulacji danymi w bazie.
// ------------------------------------------------------------
test('strona Rooms pokazuje komunikat braku wyników gdy API zwróci pustą listę sal', async ({ page }) => {
  // Mockujemy /api/rooms — serwer zwraca pustą tablicę
  await page.route('**/api/rooms', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  await loginAs(page, 'dr-kowalski', 'pass123');

  await page.getByTestId('nav-rooms').click();
  await page.waitForLoadState('networkidle');

  // Nie powinno być żadnych kart sal
  await expect(page.getByTestId('room-card')).toHaveCount(0);

  // Powinien być widoczny komunikat o braku wyników
  await expect(page.locator('.no-results')).toBeVisible();
  await expect(page.locator('.no-results')).toContainText('No rooms match your search criteria');
});
