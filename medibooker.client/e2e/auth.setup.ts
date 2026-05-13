import { test as setup } from '@playwright/test';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const AUTH_FILE = path.join(__dirname, '.auth', 'dr-kowalski.json');

// Loguje się jako dr-kowalski i zapisuje stan sesji (localStorage + cookies)
// do pliku. Kolejne testy korzystające z storageState pobierają ten stan
// zamiast logować się od nowa — co skraca czas wykonania zestawu testów.
setup('zapisz stan uwierzytelnienia dr-kowalski', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('input-username').fill('dr-kowalski');
  await page.getByTestId('input-password').fill('pass123');
  await page.getByTestId('btn-login').click();
  await page.getByTestId('brand-name').waitFor({ state: 'visible' });

  await page.context().storageState({ path: AUTH_FILE });
});