import { describe, it, expect } from 'vitest';
import { increment, minimumNextBid } from '../../src/lib/server/auction';

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
