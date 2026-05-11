import { test, expect } from '@playwright/test';
import { loginAs, toLocalDateStr } from './helpers';

// Test 9 — Pokój pokazuje "Unavailable" gdy ma aktywną rezerwację teraz
test('pokój pokazuje Unavailable gdy trwa aktywna rezerwacja', async ({ page }) => {
  await page.route('**/api/rooms', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 1, name: 'Room 101', type: 'Surgery',      floor: 1, available: true,  isActive: true },
        { id: 2, name: 'Room 203', type: 'ICU',          floor: 2, available: true,  isActive: true },
        { id: 3, name: 'Room 115', type: 'Consultation', floor: 1, available: false, isActive: true },
        { id: 4, name: 'Room 302', type: 'Radiology',    floor: 3, available: true,  isActive: true },
        { id: 5, name: 'Room 210', type: 'ICU',          floor: 2, available: true,  isActive: true },
        { id: 6, name: 'Room 118', type: 'Surgery',      floor: 1, available: true,  isActive: true },
      ]),
    });
  });

  await loginAs(page, 'dr-kowalski', 'pass123');
  await page.getByTestId('nav-rooms').click();

  const room115 = page.getByTestId('room-card').filter({ hasText: 'Room 115' });
  await expect(room115).toBeVisible();
  await expect(room115.getByTestId('room-status')).toContainText('Unavailable');
  await expect(room115.getByTestId('btn-book')).toBeDisabled();
});

// Test 10 — Rezerwacja trwająca teraz ma status "active"
test('rezerwacja trwająca teraz ma status active', async ({ page }) => {
  await page.route('**/api/bookings/my', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 100, roomId: 4, roomName: 'Room 302', doctorId: 'dr-kowalski',
          date: toLocalDateStr(new Date()), startTime: '09:00', endTime: '10:00', status: 'active',
        },
      ]),
    });
  });

  await loginAs(page, 'dr-kowalski', 'pass123');
  await page.getByTestId('nav-my-bookings').click();

  const activeRow = page.getByTestId('booking-row').filter({ hasText: 'Room 302' }).filter({ hasText: 'active' });
  await expect(activeRow).toBeVisible();
  await expect(activeRow).toContainText('active');
});

// Test 11 — Rezerwacja zakończona dzisiaj ma status "completed"
test('rezerwacja zakończona dzisiaj ma status completed', async ({ page }) => {
  await page.route('**/api/bookings/my', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 101, roomId: 5, roomName: 'Room 210', doctorId: 'dr-kowalski',
          date: toLocalDateStr(new Date()), startTime: '08:00', endTime: '09:00', status: 'completed',
        },
      ]),
    });
  });

  await loginAs(page, 'dr-kowalski', 'pass123');
  await page.getByTestId('nav-my-bookings').click();

  const completedRow = page.getByTestId('booking-row').filter({ hasText: 'Room 210' }).filter({ hasText: 'completed' });
  await expect(completedRow).toBeVisible();
  await expect(completedRow).toContainText('completed');
});