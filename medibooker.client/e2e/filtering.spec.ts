import { test, expect } from '@playwright/test';
import { loginAs } from './helpers';

test.describe('Room Filtering and Search', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'dr-smith', 'pass123');
    await page.getByTestId('nav-rooms').click();
  });

  // Test 1 — Wyszukiwanie po nazwie
  test('doctor can search for a room by name', async ({ page }) => {
    await page.getByTestId('search-rooms').fill('203');
    const cards = page.getByTestId('room-card');
    await expect(cards).toHaveCount(1);
    await expect(cards.first()).toContainText('Room 203');
  });

  // Test 2 — Filtrowanie po typie
  test('doctor can filter rooms by type', async ({ page }) => {
    await page.getByTestId('filter-type').selectOption('Surgery');
    const cards = page.getByTestId('room-card');
    // In default seed, there is at least one Surgery room (Room 203)
    await expect(cards).toHaveCount(1);
    await expect(cards.first()).toContainText('Surgery');
    
    // Check if other types are NOT visible
    await expect(cards.filter({ hasText: 'Examination' })).toHaveCount(0);
  });

  // Test 3 — Łączenie filtrów (dostępność + typ)
  test('doctor can combine availability and type filters', async ({ page }) => {
    await page.getByTestId('filter-available').click();
    await page.getByTestId('filter-type').selectOption('Consultation');
    
    const cards = page.getByTestId('room-card');
    // Ensure all visible rooms are both available AND Consultation
    const count = await cards.count();
    for (let i = 0; i < count; i++) {
      await expect(cards.nth(i).getByTestId('room-status')).toContainText('Available');
      await expect(cards.nth(i)).toContainText('Consultation');
    }
  });

  // Test 4 — Obsługa braku wyników
  test('shows empty state when no rooms match search criteria', async ({ page }) => {
    await page.getByTestId('search-rooms').fill('NonExistentRoom999');
    await expect(page.locator('.no-results')).toBeVisible();
    await expect(page.locator('.no-results')).toContainText('No rooms match your search criteria');
  });
});
