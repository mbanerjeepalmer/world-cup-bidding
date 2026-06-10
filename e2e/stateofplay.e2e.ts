import { test, expect, type Page } from '@playwright/test';

async function followMagicLink(page: Page) {
	await page.getByRole('link', { name: 'use the link directly' }).click();
	await page.getByRole('button', { name: 'Step into the saleroom' }).click();
}

async function register(page: Page, email: string, name: string) {
	await page.goto('/register');
	await page.fill('input[name="email"]', email);
	await page.fill('input[name="name"]', name);
	await page.click('button[type="submit"]');
	await followMagicLink(page);
}

// A private domain so the room is empty regardless of what other journeys did.
test('state of play: the room, every lot’s outcome ladder, and what your bid needs', async ({
	page
}) => {
	await register(page, 'sopper@stateofplay-test.com', 'Sopper');

	// Take Argentina at the 10-BonBon opening bid.
	await page.goto('/teams');
	await page.getByRole('link', { name: /Argentina/ }).click();
	await page.getByRole('button', { name: 'Place bid' }).click();
	await expect(page.getByText('Bid placed: 10 BonBons.')).toBeVisible();

	// The page is in the nav and shows the outcome grid: champions as an
	// assumed runner-up is 24 points, which at 10 BonBons scores 2.400.
	await page.getByRole('link', { name: 'State of Play' }).click();
	await expect(page).toHaveURL('/state-of-play');
	await expect(page.getByRole('row', { name: /Champions/ })).toContainText('2.400');

	// Alone in the room there is no score to beat — the page says so.
	await expect(page.getByText(/the room is yours to lose/)).toBeVisible();

	// A rival joins the room and takes France; now the page tells them what
	// their bid must achieve to top the room. (/register bounces signed-in
	// visitors home, so sign out first.)
	await page.getByRole('button', { name: 'Sign out' }).click();
	await register(page, 'rival@stateofplay-test.com', 'Rival');
	await page.goto('/teams');
	await page.getByRole('link', { name: /France/ }).click();
	await page.getByRole('button', { name: 'Place bid' }).click();
	await expect(page.getByText('Bid placed: 10 BonBons.')).toBeVisible();

	await page.goto('/state-of-play');
	await expect(page.getByText(/To top the room you must beat Sopper/)).toBeVisible();
	// Both lots appear as grid columns, each priced at its own hammer price.
	await expect(page.getByRole('columnheader', { name: /Argentina/ })).toBeVisible();
	await expect(page.getByRole('columnheader', { name: /France/ })).toBeVisible();
});
