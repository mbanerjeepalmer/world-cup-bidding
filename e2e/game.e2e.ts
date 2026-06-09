import { test, expect, type Page } from '@playwright/test';

// Tests share one freshly-seeded server (workers: 1). They run in declaration
// order, and the FIRST successful registration becomes the auctioneer/admin —
// so the admin journey is declared first and deliberately registers that user.
test.describe.configure({ mode: 'serial' });

async function register(page: Page, email: string, name: string, password = 'password123') {
	await page.goto('/register');
	await page.fill('input[name="email"]', email);
	await page.fill('input[name="name"]', name);
	await page.fill('input[name="password"]', password);
	await page.click('button[type="submit"]');
}

test('the bonhams.com gate rejects an outside email', async ({ page }) => {
	await register(page, 'outsider@gmail.com', 'Outsider');
	await expect(page).toHaveURL(/\/register/);
	await expect(page.getByText('limited to bonhams.com')).toBeVisible();
});

test('full journey: register admin, bid, set a result, see points ÷ price', async ({ page }) => {
	// First successful signup → admin.
	await register(page, 'auctioneer@bonhams.com', 'Auctioneer');
	await expect(page).toHaveURL('/');
	await expect(page.getByText('1000 of 1000 BonBons free')).toBeVisible();
	await expect(page.getByRole('link', { name: 'Admin' })).toBeVisible();

	// Place an opening bid on Brazil and confirm the standard increment kicks in.
	await page.goto('/teams');
	await page.getByRole('link', { name: /Brazil/ }).click();
	await expect(page.getByText('Opening bid: 10 BonBons')).toBeVisible();
	await page.getByRole('button', { name: 'Place bid' }).click();
	await expect(page.getByText('Bid placed: 10 BonBons.')).toBeVisible();
	await expect(page.getByText('High bid:')).toBeVisible();
	// Next minimum is 10 + 5 = 15.
	await expect(page.locator('input[name="amount"]')).toHaveValue('15');

	// Record Brazil as group winner and champion via the admin panel (50 points).
	const brazilUrl = page.url();
	await page.goto('/admin/teams');
	const row = page.getByRole('row', { name: /Brazil/ });
	await row.locator('select[name="group_position"]').selectOption('1');
	await row.locator('select[name="exit_stage"]').selectOption('champion');
	await row.getByRole('button', { name: 'Save' }).click();
	await expect(row.locator('select[name="exit_stage"]')).toHaveValue('champion');

	// Leaderboard: 50 points for 10 BonBons → 5.000.
	await page.goto('/leaderboard');
	const boardRow = page.getByRole('row', { name: /Auctioneer/ });
	await expect(boardRow).toContainText('50');
	await expect(boardRow).toContainText('5.000');

	// The lot page now reflects the owner holding the high bid.
	await page.goto(brazilUrl);
	await expect(page.getByText('You hold this lot')).toBeVisible();
});

test('a second bidder can outbid and take the lead', async ({ page }) => {
	await register(page, 'bidder2@bonhams.com', 'Bidder Two');
	await expect(page).toHaveURL('/');
	// Bidder Two is not the admin.
	await expect(page.getByRole('link', { name: 'Admin' })).toHaveCount(0);

	// Brazil already has the admin's 10 BonBon bid; outbid at 15.
	await page.goto('/teams');
	await page.getByRole('link', { name: /Brazil/ }).click();
	await page.fill('input[name="amount"]', '15');
	await page.getByRole('button', { name: 'Place bid' }).click();
	await expect(page.getByText('Bid placed: 15 BonBons.')).toBeVisible();
	await expect(page.getByText('You hold this lot')).toBeVisible();
});

test('a bid below the minimum increment is blocked', async ({ page }) => {
	await register(page, 'bidder3@bonhams.com', 'Bidder Three');
	await page.goto('/teams');
	await page.getByRole('link', { name: /Brazil/ }).click();

	// Standing high bid is 15, so the next minimum is 20 (15 + the +5 increment).
	await expect(page.getByText('min 20')).toBeVisible();
	await expect(page.locator('input[name="amount"]')).toHaveAttribute('min', '20');

	// Try to undercut the increment with 16; the form must not take the lead.
	await page.fill('input[name="amount"]', '16');
	await page.getByRole('button', { name: 'Place bid' }).click();

	// The lot is unchanged: still 15 BonBons, still held by Bidder Two.
	await expect(page.getByText('High bid:')).toContainText('15 BonBons');
	await expect(page.getByText('by Bidder Two')).toBeVisible();
	await expect(page.getByText('You hold this lot')).toHaveCount(0);
});
