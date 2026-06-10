import { test, expect, type Page } from '@playwright/test';

// Tests share one freshly-seeded server (workers: 1). They run in declaration
// order, and the FIRST successful registration becomes the auctioneer/admin —
// so the admin journey is declared first and deliberately registers that user.
test.describe.configure({ mode: 'serial' });

// Auth is passwordless: the form emails a magic link, which the e2e server
// echoes into the page (MAGIC_LINK_ECHO=1 in playwright.config.ts), and the
// link lands on a confirm page so mail scanners can't burn the token.
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

async function login(page: Page, email: string) {
	await page.goto('/login');
	await page.fill('input[name="email"]', email);
	await page.click('button[type="submit"]');
	await followMagicLink(page);
}

test('full journey: register admin, bid, set a result, see points ÷ price', async ({ page }) => {
	// First successful signup → admin.
	await register(page, 'auctioneer@example.com', 'Auctioneer');
	await expect(page).toHaveURL('/');
	await expect(page.getByText('no lot held')).toBeVisible();
	await expect(page.getByRole('link', { name: 'Admin' })).toBeVisible();

	// Place an opening bid on Brazil and confirm the standard increment kicks in.
	await page.goto('/teams');
	await page.getByRole('link', { name: /Brazil/ }).click();
	// Staggered close: each lot displays its own hammer time.
	await expect(page.getByText('Hammer falls at')).toBeVisible();
	await expect(page.getByText('Opening bid: 10 BonBons')).toBeVisible();
	await page.getByRole('button', { name: 'Place bid' }).click();
	await expect(page.getByText('Bid placed: 10 BonBons.')).toBeVisible();
	await expect(page.getByText('High bid:')).toBeVisible();
	// Next minimum is 10 + 5 = 15, and the header now shows the held lot.
	await expect(page.locator('input[name="amount"]')).toHaveValue('15');
	await expect(page.getByText(/leading .*Brazil/)).toBeVisible();
	const brazilUrl = page.url();

	// One team per bidder: every other lot is off limits while leading Brazil.
	await page.goto('/teams');
	await page.getByRole('link', { name: /Argentina/ }).click();
	await expect(page.getByRole('button', { name: 'Place bid' })).toBeDisabled();
	await expect(page.getByText('One team per bidder')).toBeVisible();

	// Record Brazil as group winner and champion via the admin panel (25 points).
	await page.goto('/admin/teams');
	const row = page.getByRole('row', { name: /Brazil/ });
	await row.locator('select[name="group_position"]').selectOption('1');
	await row.locator('select[name="exit_stage"]').selectOption('champion');
	await row.getByRole('button', { name: 'Save' }).click();
	await expect(row.locator('select[name="exit_stage"]')).toHaveValue('champion');

	// Leaderboard: 25 points for 10 BonBons → 2.500.
	await page.goto('/leaderboard');
	const boardRow = page.getByRole('row', { name: /Auctioneer/ });
	await expect(boardRow).toContainText('25');
	await expect(boardRow).toContainText('2.500');

	// The lot page now reflects the owner holding the high bid.
	await page.goto(brazilUrl);
	await expect(page.getByText('You hold this lot')).toBeVisible();
});

test('a second bidder can outbid and take the lead', async ({ page }) => {
	await register(page, 'bidder2@example.com', 'Bidder Two');
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

test('fixtures come from the feed: groups set, qualifiers in, placeholders out', async ({ page }) => {
	// Sign back in as the admin (also covers the magic-link login flow).
	await login(page, 'auctioneer@example.com');
	await expect(page).toHaveURL('/');

	// The startup sync ran against the feed fixture: real qualifiers replace
	// the seeded play-off placeholders, and groups are assigned.
	await page.goto('/teams');
	await expect(page.getByRole('link', { name: /Czech Republic/ })).toBeVisible();
	await expect(page.getByText('UEFA Play-off Winner A')).toHaveCount(0);
	await expect(page.getByRole('row', { name: /Brazil/ })).toContainText('C');
	// The sale shows the staggered running order.
	await expect(page.getByRole('columnheader', { name: 'Hammer' })).toBeVisible();

	// And the admin can re-sync on demand.
	await page.goto('/admin');
	await page.getByRole('button', { name: 'Sync now' }).click();
	await expect(page.getByText(/Synced 48 teams/)).toBeVisible();
});

test('a bid below the minimum increment is blocked', async ({ page }) => {
	await register(page, 'bidder3@example.com', 'Bidder Three');
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

test('each email domain is its own tenant: a private sale and leaderboard', async ({ page }) => {
	// A bidder from another domain registers — open to anyone.
	await register(page, 'rival@gmail.com', 'Rival');
	await expect(page).toHaveURL('/');

	// Brazil stands at 15 in the example.com room, but gmail sees a fresh lot
	// and can open at the minimum without outbidding anyone.
	await page.goto('/teams');
	await page.getByRole('link', { name: /Brazil/ }).click();
	await expect(page.getByText('Opening bid: 10 BonBons')).toBeVisible();
	await page.getByRole('button', { name: 'Place bid' }).click();
	await expect(page.getByText('Bid placed: 10 BonBons.')).toBeVisible();
	await expect(page.getByText('You hold this lot')).toBeVisible();

	// And the gmail leaderboard shows gmail bidders only.
	await page.goto('/leaderboard');
	await expect(page.getByText('@gmail.com').first()).toBeVisible();
	await expect(page.getByRole('row', { name: /Rival/ })).toBeVisible();
	await expect(page.getByText('Auctioneer')).toHaveCount(0);
	await expect(page.getByText('Bidder Two')).toHaveCount(0);
});
