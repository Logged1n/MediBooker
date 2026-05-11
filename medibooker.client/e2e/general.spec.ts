import { test, expect } from '@playwright/test';
import { loginAs } from './helpers';

// Dashboard wyświetla  statystyki po zalogowaniu
test('dashboard wyświetla statystyki sal po zalogowaniu', async ({ page }) => {
    await loginAs(page, 'dr-kowalski', 'pass123');
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId('stat-available')).toBeVisible();
    await expect(page.getByTestId('stat-total')).toBeVisible(); //dwie karty widoczne


    const totalText = await page.getByTestId('stat-total').textContent(); // liczba sal >0
    const total = parseInt(totalText?.match(/\d+/)?.[0] ?? '0', 10);
    expect(total).toBeGreaterThan(0);
});

// Pole wyszukiwania sal  widoczne po przejściu do Rooms
test('pole wyszukiwania i filtry są widoczne na stronie Rooms', async ({ page }) => {
    await loginAs(page, 'dr-kowalski', 'pass123');
    await page.getByTestId('nav-rooms').click();

    await expect(page.getByTestId('search-rooms')).toBeVisible();
    await expect(page.getByTestId('filter-type')).toBeVisible();
    await expect(page.getByTestId('filter-available')).toBeVisible();
});

// Widocznosc zakladki admin w navbarze
test('admin widzi zakładkę admin w navbarze', async ({ page }) => {
    await loginAs(page, 'admin', 'admin123');

    await expect(page.getByTestId('nav-admin')).toBeVisible();
});

// Zamknięcie widoku rezerwacji przyciskiem X
test('modal rezerwacji zamyka się po kliknięciu przycisku zamknij', async ({ page }) => {
    await loginAs(page, 'dr-kowalski', 'pass123');

    await page.getByTestId('nav-rooms').click();
    await page.getByTestId('filter-available').click();

    // otworzenie widoku
    await page.getByTestId('btn-book').first().click();
    await expect(page.getByTestId('booking-modal')).toBeVisible();

    // zamkniecie widoku
    await page.locator('.modal-close').click();
    await expect(page.getByTestId('booking-modal')).not.toBeVisible();
});

// Filtr "Available" pokazuje tylko dostępne sale
test('filtr dostępności pokazuje wyłącznie sale ze statusem Available', async ({ page }) => {
    await loginAs(page, 'dr-smith', 'pass123');

    await page.getByTestId('nav-rooms').click();
    await page.getByTestId('filter-available').click();

    const cards = page.getByTestId('room-card');
    await expect(cards.first()).toBeVisible();

    
    const count = await cards.count();
    for (let i = 0; i < count; i++) {
        await expect(cards.nth(i).getByTestId('room-status')).toContainText('Available');// kazda karta status available
    }
});

// Wyszukiwarka zwraca pusty stan dla sali, ktora nie istnieje
test('wyszukiwarka pokazuje komunikat braku wyników dla nieznanej frazy', async ({ page }) => {
    await loginAs(page, 'dr-smith', 'pass123');
    await page.getByTestId('nav-rooms').click();
    await page.getByTestId('search-rooms').fill('ZupełnieNieistniejącaSala999');

    await expect(page.locator('.no-results')).toBeVisible(); //brak winikow sal
    await expect(page.locator('.no-results')).toContainText('No rooms match your search criteria');
    await expect(page.getByTestId('room-card')).toHaveCount(0);
});

// Wyswietlanie tabeli rezerwacji w my bookings
test('strona My Bookings wyświetla tabelę z rezerwacjami lekarza', async ({ page }) => {
    await loginAs(page, 'dr-kowalski', 'pass123');

    await page.getByTestId('nav-my-bookings').click();
    await expect(page.getByTestId('bookings-table')).toBeVisible(); //tabela widoczna

    const rows = page.getByTestId('booking-row');
    const count = await rows.count();

    if (count > 0) {
        for (let i = 0; i < count; i++) {
            await expect(rows.nth(i)).toContainText('dr-kowalski'); //kazdy wiersz zawiera identyfikator lekarza
        }
    }
});

// Przycisk rezerwacji jest wyłączony dla sali zajetej
test('przycisk Book Room jest disabled dla sali zajętej w tej chwili', async ({ page }) => {
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