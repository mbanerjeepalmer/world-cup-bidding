import { test, expect } from '@playwright/test';

// The calculator is pure maths over public rules — no sign-in required.
test('calculator: price + outcome → score, and the most a result is worth paying', async ({
	page
}) => {
	await page.goto('/calculator');

	// A group winner who lifts the cup at 10 BonBons: 25 points, 2.500.
	await page.fill('input[name="price"]', '10');
	await page.selectOption('select[name="position"]', '1');
	await page.selectOption('select[name="outcome"]', 'champion');
	await expect(page.getByTestId('points')).toHaveText('25');
	await expect(page.getByTestId('score')).toHaveText('2.500');

	// Against a 0.3 target, 10 BonBons needs 4+ points — an R16 run does it —
	// and champions (25 pts) stops being worth it beyond 83 BonBons.
	await page.fill('input[name="target"]', '0.3');
	await expect(page.getByTestId('needed')).toContainText('4+ points');
	await expect(page.getByTestId('needed')).toContainText('Out in Round of 16');
	await expect(page.getByTestId('maxbid')).toContainText('83');

	// Outcomes follow the group position: a fourth-placed team goes home with
	// nothing, so the knockout outcomes disappear.
	await page.selectOption('select[name="position"]', '4');
	await expect(page.getByTestId('points')).toHaveText('0');
	await expect(page.locator('select[name="outcome"] option')).toHaveCount(1);
});
