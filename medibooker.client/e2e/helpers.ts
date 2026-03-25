import { Page } from '@playwright/test';

/** Formats a Date as YYYY-MM-DD using LOCAL timezone (avoids UTC-offset date drift). */
export function toLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getTomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return toLocalDateStr(d);
}

export async function loginAs(page: Page, username: string, password: string): Promise<void> {
  await page.goto('/');
  await page.getByTestId('input-username').fill(username);
  await page.getByTestId('input-password').fill(password);
  await page.getByTestId('btn-login').click();
  await page.getByTestId('brand-name').waitFor({ state: 'visible' });
}
