import { describe, it, expect } from 'vitest';
import { increment, minimumNextBid, scheduleCloseTimes } from '../../src/lib/server/auction';

// v1.md: "The bidding increments are standard." These mirror the table the
// Rules page shows the bidder.
describe('increment — standard auction-house steps', () => {
	it('uses small steps for cheap lots and larger ones as the price climbs', () => {
		expect(increment(10)).toBe(5); // under 100
		expect(increment(95)).toBe(5);
		expect(increment(100)).toBe(10); // 100–199
		expect(increment(200)).toBe(25); // 200–499
		expect(increment(500)).toBe(50); // 500–999
		expect(increment(1000)).toBe(100); // 1,000–1,999
		expect(increment(2000)).toBe(250); // 2,000–4,999
		expect(increment(5000)).toBe(500); // 5,000+
		expect(increment(50000)).toBe(500);
	});

	it('steps exactly at each boundary', () => {
		expect(increment(99)).toBe(5);
		expect(increment(199)).toBe(10);
		expect(increment(499)).toBe(25);
		expect(increment(999)).toBe(50);
	});
});

describe('minimumNextBid', () => {
	it('falls back to the configured opening bid when there are no bids', () => {
		// Seeded default min_opening_bid is 10.
		expect(minimumNextBid(null)).toBe(10);
	});

	it('is the current bid plus the applicable increment', () => {
		expect(minimumNextBid(10)).toBe(15);
		expect(minimumNextBid(100)).toBe(110);
		expect(minimumNextBid(500)).toBe(550);
	});
});

describe('scheduleCloseTimes — the staggered running order', () => {
	const firstHammer = new Date('2026-06-11T18:00:00Z'); // an hour before kickoff

	it('hammers lots in group order, alphabetically within a group, starting at the first hammer', () => {
		const lots = [
			{ id: 1, group_name: 'B', name: 'Brazil' },
			{ id: 2, group_name: 'A', name: 'Mexico' },
			{ id: 3, group_name: 'A', name: 'Algeria' }
		];
		const schedule = scheduleCloseTimes(lots, firstHammer, 5);
		// Running order: Algeria (A), Mexico (A), Brazil (B).
		expect(schedule.get(3)?.toISOString()).toBe('2026-06-11T18:00:00.000Z');
		expect(schedule.get(2)?.toISOString()).toBe('2026-06-11T18:05:00.000Z');
		expect(schedule.get(1)?.toISOString()).toBe('2026-06-11T18:10:00.000Z');
	});

	it('a single lot closes exactly at the first hammer', () => {
		const schedule = scheduleCloseTimes([{ id: 1, group_name: 'A', name: 'X' }], firstHammer, 5);
		expect(schedule.get(1)?.getTime()).toBe(firstHammer.getTime());
	});

	it('48 lots a minute apart close the last lot 47 minutes after the first hammer', () => {
		const lots = Array.from({ length: 48 }, (_, i) => ({
			id: i,
			group_name: 'A',
			name: `Team ${String(i).padStart(2, '0')}`
		}));
		const schedule = scheduleCloseTimes(lots, firstHammer, 1);
		expect(schedule.get(47)?.getTime()).toBe(firstHammer.getTime() + 47 * 60_000);
	});
});
