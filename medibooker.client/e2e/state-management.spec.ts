import { test, expect } from '@playwright/test';

// ============================================================
// Testy z zarządzaniem stanem uwierzytelnienia (storageState)
//
// Testy w tym pliku NIE wywołują loginAs() — przeglądarka
// startuje z gotowym stanem sesji zapisanym przez auth.setup.ts.
// Dzięki temu logowanie wykonuje się tylko RAZ dla całego zestawu,
// a poszczególne testy są szybsze i nie są od siebie uzależnione.
// ============================================================

// ------------------------------------------------------------
// Test S1 — Dashboard jest widoczny od razu bez ekranu logowania
// Przypadek testowy: TC-AUTH-STATE-01
// Opis: Po przywróceniu zapisanego stanu sesji aplikacja powinna
//       wyświetlić Dashboard (nie ekran logowania). Weryfikuje,
//       że token z localStorage został poprawnie wczytany.
// ------------------------------------------------------------
test('dashboard jest widoczny natychmiast bez ekranu logowania', async ({ page }) => {
  await page.goto('/');

  // Pasek nawigacyjny powinien być widoczny od razu — nie formularz logowania
  await expect(page.getByTestId('navbar')).toBeVisible();
  await expect(page.getByTestId('login-form')).toHaveCount(0);

  // Widoczne są statystyki dashboardu
  await expect(page.getByTestId('stat-total')).toBeVisible();
  await expect(page.getByTestId('stat-available')).toBeVisible();
});

// ------------------------------------------------------------
// Test S2 — Navbar wyświetla poprawne dane zalogowanego użytkownika
// Przypadek testowy: TC-AUTH-STATE-02
// Opis: Po wczytaniu stanu sesji navbar powinien wyświetlać nazwę
//       i rolę zalogowanego użytkownika. Weryfikuje, że storageState
//       zawiera pełne dane profilu (displayName, role).
// ------------------------------------------------------------
test('navbar wyświetla imię i rolę zalogowanego użytkownika ze stanu sesji', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByTestId('user-name')).toBeVisible();
  await expect(page.getByTestId('user-name')).toContainText('Dr. Kowalski');

  await expect(page.getByTestId('user-role')).toBeVisible();
  await expect(page.getByTestId('user-role')).toContainText('Doctor');
});

// ------------------------------------------------------------
// Test S3 — Strona Rooms ładuje się bez logowania w teście
// Przypadek testowy: TC-AUTH-STATE-03
// Opis: Nawigacja do sekcji Rooms powinna działać bez żadnego
//       kroku logowania w teście — token z zapisanego stanu
//       jest automatycznie używany do wywołań API.
// ------------------------------------------------------------
test('strona Rooms ładuje listę sal bez konieczności logowania w teście', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('nav-rooms').click();

  // Przynajmniej jedna karta sali powinna być widoczna
  await expect(page.getByTestId('room-card').first()).toBeVisible();

  // Filtry są dostępne (strona w pełni załadowana)
  await expect(page.getByTestId('filter-available')).toBeVisible();
  await expect(page.getByTestId('search-rooms')).toBeVisible();
});