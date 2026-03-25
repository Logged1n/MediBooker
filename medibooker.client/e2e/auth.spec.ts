import { test, expect } from '@playwright/test';

// Test 1 — Rejestracja nowego konta
test('rejestracja nowego konta lekarza', async ({ page }) => {
  await page.goto('/');

  // Powinniśmy zobaczyć stronę logowania
  await expect(page.getByTestId('login-form')).toBeVisible();

  // Przejdź do rejestracji
  await page.getByTestId('btn-go-register').click();
  await expect(page.getByTestId('register-form')).toBeVisible();

  // Wypełnij formularz rejestracji (unikalny username przy każdym uruchomieniu)
  const uniqueUsername = `dr-test-${Date.now()}`;
  await page.getByTestId('input-display-name').fill('Dr. Testowy');
  await page.getByTestId('input-reg-username').fill(uniqueUsername);
  await page.getByTestId('input-reg-password').fill('nowak123');
  await page.getByTestId('select-role').selectOption('Doctor');

  await page.getByTestId('btn-register').click();

  // Po rejestracji użytkownik powinien być zalogowany i widzieć dashboard
  await expect(page.getByTestId('brand-name')).toBeVisible();
  await expect(page.getByTestId('brand-name')).toContainText('MediBooker');
  await expect(page.getByTestId('user-name')).toContainText('Dr. Testowy');
});

// Test 2 — Logowanie poprawnymi danymi
test('logowanie z poprawnymi danymi wyświetla dashboard', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByTestId('login-form')).toBeVisible();

  await page.getByTestId('input-username').fill('dr-kowalski');
  await page.getByTestId('input-password').fill('pass123');
  await page.getByTestId('btn-login').click();

  // Po zalogowaniu widoczny jest navbar z brandingiem
  await expect(page.getByTestId('brand-name')).toContainText('MediBooker');
  await expect(page.getByTestId('user-name')).toBeVisible();

  // Dashboard widoczny z kartami statystyk
  await expect(page.getByTestId('stat-available')).toBeVisible();
  await expect(page.getByTestId('stat-total')).toContainText('6');
});

// Test 3 — Logowanie błędnym hasłem wyświetla błąd
test('logowanie z błędnym hasłem wyświetla komunikat błędu', async ({ page }) => {
  await page.goto('/');

  await page.getByTestId('input-username').fill('dr-kowalski');
  await page.getByTestId('input-password').fill('wrongpassword123');
  await page.getByTestId('btn-login').click();

  // Powinien pojawić się komunikat błędu
  await expect(page.getByTestId('login-error')).toBeVisible();

  // Użytkownik nadal na stronie logowania
  await expect(page.getByTestId('login-form')).toBeVisible();
});
