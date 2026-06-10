import { test, expect, type Page } from '@playwright/test';

// Phone-sized viewport: the sale runs while people are away from their desks,
// so every page a bidder checks mid-auction must fit without sideways scroll.
test.use({ viewport: { width: 375, height: 667 } });

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

test('phone width: no page fits sideways scroll on the pages bidders live on', async ({
	page
}) => {
	await register(page, 'mobile@example.com', 'Mobile Bidder');

	for (const path of ['/teams', '/leaderboard', '/portfolio', '/rules', '/']) {
		await page.goto(path);
		await page.waitForLoadState('networkidle');
		const overflow = await page.evaluate(
			() => document.documentElement.scrollWidth - document.documentElement.clientWidth
		);
		expect(overflow, `${path} overflows the viewport horizontally`).toBeLessThanOrEqual(0);
	}
});
