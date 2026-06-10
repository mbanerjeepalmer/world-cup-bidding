import { describe, it, expect } from 'vitest';
import {
	teamPoints,
	outcomeLadder,
	pointsNeededToBeat,
	neededOutcome
} from '../../src/lib/points';

// The pure scoring math lives in $lib (not $lib/server) so the in-browser
// calculator can share the exact rules the leaderboard scores with.
describe('teamPoints is re-exported from the shared module', () => {
	it('matches the canonical examples', () => {
		expect(teamPoints(1, 'champion')).toBe(25);
		expect(teamPoints(4, null)).toBe(0);
	});
});

describe('outcomeLadder — every result a team can still achieve, worst first', () => {
	it('a group winner climbs from a Round-of-32 exit (3) to champions (25)', () => {
		const ladder = outcomeLadder(1);
		expect(ladder[0]).toMatchObject({ exitStage: 'r32', points: 3 });
		expect(ladder[ladder.length - 1]).toMatchObject({ exitStage: 'champion', points: 25 });
		// Strictly ascending: the ladder is used to find the cheapest sufficient outcome.
		for (let i = 1; i < ladder.length; i++) {
			expect(ladder[i].points).toBeGreaterThan(ladder[i - 1].points);
		}
	});

	it('a runner-up scores one less at every rung', () => {
		const first = outcomeLadder(1);
		const second = outcomeLadder(2);
		expect(second.map((o) => o.points)).toEqual(first.map((o) => o.points - 1));
	});

	it('a third-placed team can still qualify (2026 format) but may also go out in the group', () => {
		const ladder = outcomeLadder(3);
		expect(ladder[0]).toMatchObject({ exitStage: null, points: 1 });
		expect(ladder[ladder.length - 1]).toMatchObject({ exitStage: 'champion', points: 23 });
	});

	it('fourth place goes home with nothing — the ladder has a single rung', () => {
		expect(outcomeLadder(4)).toEqual([
			expect.objectContaining({ exitStage: null, points: 0 })
		]);
	});

	it('every rung carries a human label', () => {
		for (const rung of outcomeLadder(2)) {
			expect(rung.label).toBeTruthy();
		}
	});
});

describe('pointsNeededToBeat — the heart of "is my bid worth it"', () => {
	it('beating means strictly more: matching the score is not enough', () => {
		// At 10 BonBons, 3 points exactly ties a 0.3 score — you need 4.
		expect(pointsNeededToBeat(10, 0.3)).toBe(4);
	});

	it('is robust to floating-point edges where the product looks like an integer', () => {
		// 0.29 × 100 = 28.999999999999996 in floats; 29/100 only ties, so 30.
		expect(pointsNeededToBeat(100, 0.29)).toBe(30);
	});

	it('rounds a fractional threshold up', () => {
		// 0.05 × 150 = 7.5 → 8 points (8/150 ≈ 0.053).
		expect(pointsNeededToBeat(150, 0.05)).toBe(8);
	});

	it('any point at all beats a scoreless room', () => {
		expect(pointsNeededToBeat(1000, 0)).toBe(1);
	});
});

describe('neededOutcome — the cheapest result that clears a points bar', () => {
	it('finds the first rung at or above the bar', () => {
		// A group winner needs 4 points: R32 exit gives 3, R16 exit gives 5.
		expect(neededOutcome(4, 1)).toMatchObject({ exitStage: 'r16', points: 5 });
	});

	it('returns the bottom rung when anything will do', () => {
		expect(neededOutcome(1, 1)).toMatchObject({ exitStage: 'r32', points: 3 });
	});

	it('returns null when even winning the cup is not enough', () => {
		expect(neededOutcome(26, 1)).toBeNull();
		expect(neededOutcome(1, 4)).toBeNull(); // 4th in group never scores
	});
});
