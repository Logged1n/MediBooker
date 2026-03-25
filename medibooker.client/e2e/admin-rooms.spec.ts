import { test, expect } from '@playwright/test';
import { loginAs } from './helpers';

test.describe('Admin Room Management', () => {

  // Test 5 — Dodawanie nowej sali
  test('admin can add a new room and it appears for doctors', async ({ page, browser }) => {
    // 1. Login as Admin
    await loginAs(page, 'admin', 'admin123');
    await page.getByTestId('nav-admin').click();
    
    // 2. Add room
    const roomName = `Test Room ${Date.now()}`;
    await page.getByTestId('btn-add-room').click();
    await page.getByTestId('admin-room-name').fill(roomName);
    await page.getByTestId('admin-room-type').selectOption('ICU');
    await page.getByTestId('admin-room-floor').fill('5');
    await page.getByTestId('btn-save-room').click();
    
    // 3. Verify in admin table
    await expect(page.getByTestId('admin-rooms-table')).toContainText(roomName);
    
    // 4. Verify in doctor view (as another user)
    const doctorPage = await browser.newPage();
    await loginAs(doctorPage, 'dr-smith', 'pass123');
    await doctorPage.getByTestId('nav-rooms').click();
    await doctorPage.getByTestId('search-rooms').fill(roomName);
    await expect(doctorPage.getByTestId('room-card')).toBeVisible();
    await expect(doctorPage.getByTestId('room-card')).toContainText(roomName);
    await doctorPage.close();
  });

  // Test 6 — Edycja istniejącej sali
  test('admin can edit room details', async ({ page }) => {
    await loginAs(page, 'admin', 'admin123');
    await page.getByTestId('nav-admin').click();
    
    // Edit the first room in the table
    const roomRow = page.getByTestId('admin-rooms-table').locator('tbody tr').first();
    const oldName = await roomRow.locator('td').first().textContent() ?? '';
    const newName = `Renamed Room ${Date.now()}`;
    
    await roomRow.getByTestId('btn-edit-room').click();
    await page.getByTestId('admin-room-name').fill(newName);
    await page.getByTestId('btn-save-room').click();
    
    await expect(page.getByTestId('admin-rooms-table')).toContainText(newName);
    await expect(page.getByTestId('admin-rooms-table')).not.toContainText(oldName);
  });

  // Test 7 — Dezaktywacja sali (IsActive)
  test('admin can deactivate room, making it unavailable for booking', async ({ page, browser }) => {
    await loginAs(page, 'admin', 'admin123');
    await page.getByTestId('nav-admin').click();
    
    const roomRow = page.getByTestId('admin-rooms-table').locator('tbody tr').first();
    const roomName = await roomRow.locator('td').first().textContent() ?? '';
    
    // Deactivate
    await roomRow.getByTestId('btn-edit-room').click();
    await page.getByTestId('admin-room-active').uncheck();
    await page.getByTestId('btn-save-room').click();
    
    // Verify Inactive in admin table
    await expect(roomRow).toContainText('Inactive');
    
    // Verify Unavailable for Doctor
    const doctorPage = await browser.newPage();
    await loginAs(doctorPage, 'dr-smith', 'pass123');
    await doctorPage.getByTestId('nav-rooms').click();
    await doctorPage.getByTestId('search-rooms').fill(roomName);
    
    const statusBadge = doctorPage.getByTestId('room-status');
    await expect(statusBadge).toContainText('Unavailable');
    await expect(doctorPage.getByTestId('btn-book')).toBeDisabled();
    
    await doctorPage.close();
  });

  // Test 8 — Usuwanie sali
  test('admin can delete a room from the system', async ({ page }) => {
    await loginAs(page, 'admin', 'admin123');
    await page.getByTestId('nav-admin').click();
    
    const roomRow = page.getByTestId('admin-rooms-table').locator('tbody tr').last();
    const roomName = await roomRow.locator('td').first().textContent() ?? '';
    
    // Handle confirmation dialog
    page.on('dialog', dialog => dialog.accept());
    
    await roomRow.getByTestId('btn-delete-room').click();
    
    // Verify it's gone from table
    await expect(page.getByTestId('admin-rooms-table')).not.toContainText(roomName);
  });
});
