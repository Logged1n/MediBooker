import { test, expect } from '@playwright/test';
import { loginAs, getTomorrow } from './helpers';

test('rooms page renders mocked room inventory returned by the API', async ({ page }) => {
  await page.route('**/api/rooms', (route) => {
    if (route.request().method() !== 'GET') {
      return route.continue();
    }

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 1, name: 'Room Alpha', type: 'Consultation', floor: 1, available: true, isActive: true },
        { id: 2, name: 'Room Beta', type: 'Surgery', floor: 2, available: false, isActive: true },
        { id: 3, name: 'Room Gamma', type: 'ICU', floor: 3, available: true, isActive: true },
      ]),
    });
  });

  await loginAs(page, 'dr-kowalski', 'pass123');
  await page.getByTestId('nav-rooms').click();

  await expect(page.getByTestId('room-card')).toHaveCount(3);
  await expect(page.getByTestId('room-card').filter({ hasText: 'Room Alpha' }).getByTestId('room-status')).toContainText('Available');
  await expect(page.getByTestId('room-card').filter({ hasText: 'Room Beta' }).getByTestId('room-status')).toContainText('Unavailable');
  await expect(page.getByTestId('room-card').filter({ hasText: 'Room Gamma' }).getByTestId('room-status')).toContainText('Available');
});

test('booking modal shows generic server error when booking API returns 500', async ({ page }) => {
  await page.route('**/api/rooms', (route) => {
    if (route.request().method() !== 'GET') {
      return route.continue();
    }

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 1, name: 'Room Omega', type: 'Consultation', floor: 2, available: true, isActive: true },
      ]),
    });
  });

  await page.route('**/api/rooms/1/available-slots**', (route) => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { start: '09:00', end: '10:00' },
        { start: '11:00', end: '12:00' },
      ]),
    });
  });

  await page.route('**/api/bookings', async (route) => {
    if (route.request().method() !== 'POST') {
      return route.continue();
    }

    return route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Unexpected server error. Please try again later.' }),
    });
  });

  await loginAs(page, 'dr-kowalski', 'pass123');
  await page.getByTestId('nav-rooms').click();

  const bookButton = page.getByTestId('btn-book').first();
  await expect(bookButton).toBeVisible();
  await bookButton.click();

  await page.getByTestId('input-date').fill(getTomorrow());
  await expect(page.getByTestId('slots-list')).toBeVisible();
  await page.getByTestId('slot-btn').first().click();

  await page.getByTestId('btn-confirm-booking').click();
  await expect(page.getByTestId('booking-error')).toBeVisible();
  await expect(page.getByTestId('booking-error')).toContainText('Unexpected server error');
});

test('my bookings page displays empty state when backend returns no bookings', async ({ page }) => {
  await page.route('**/api/bookings/my', (route) => {
    if (route.request().method() !== 'GET') {
      return route.continue();
    }

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  await loginAs(page, 'dr-kowalski', 'pass123');
  await page.getByTestId('nav-my-bookings').click();

  await expect(page.getByTestId('bookings-table')).toBeVisible();
  await expect(page.locator('text=No bookings found.')).toBeVisible();
});