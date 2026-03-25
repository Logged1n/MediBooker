import { Page } from '@playwright/test';

export function getTomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

export async function loginAs(page: Page, username: string, password: string): Promise<void> {
  await page.goto('/');
  await page.getByTestId('input-username').fill(username);
  await page.getByTestId('input-password').fill(password);
  await page.getByTestId('btn-login').click();
  await page.getByTestId('brand-name').waitFor({ state: 'visible' });
}
