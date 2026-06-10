import { describe, it, expect, beforeEach } from 'vitest';
import { db, setSetting } from '../../src/lib/server/db';
import { placeBid } from '../../src/lib/server/auction';
import { notifyHammeredLots } from '../../src/lib/server/notify';
import { resetDb, makeUser, makeTeam, openAuction } from '../helpers';

// RESEND_API_KEY is unset under vitest, so sendLotWon logs instead of posting;
// these tests cover the sweep's bookkeeping, not Resend itself.

const sentKeys = () =>
	(db.prepare('SELECT key FROM notifications ORDER BY key').all() as { key: string }[]).map(
		(r) => r.key
	);

beforeEach(() => {
	resetDb();
	openAuction();
});

describe('notifyHammeredLots', () => {
	it('records a lot_won notice once per domain when the hammer has fallen', async () => {
		const alice = makeUser('Alice');
		const brazil = makeTeam('Brazil');
		placeBid(brazil, alice, 10);

		// Hammer falls just now: kickoff is close_margin (120m) from now.
		setSetting('kickoff', new Date(Date.now() + 120 * 60_000).toISOString());

		await notifyHammeredLots('http://test');
		expect(sentKeys()).toEqual([`lot_won:example.com:${brazil}`]);

		// A second sweep is a no-op.
		await notifyHammeredLots('http://test');
		expect(sentKeys()).toEqual([`lot_won:example.com:${brazil}`]);
	});

	it('ignores open lots and lots without a high bidder', async () => {
		const alice = makeUser('Alice');
		const brazil = makeTeam('Brazil');
		makeTeam('Argentina'); // never bid on
		placeBid(brazil, alice, 10);

		await notifyHammeredLots('http://test'); // auction wide open
		expect(sentKeys()).toEqual([]);
	});

	it('records stale wins silently after the auction has long closed', async () => {
		const alice = makeUser('Alice');
		const brazil = makeTeam('Brazil');
		placeBid(brazil, alice, 10);
		setSetting('kickoff', '2000-01-01T00:00:00Z'); // closed decades ago

		await notifyHammeredLots('http://test');
		// Claimed (so it will never email) even though nothing was sent.
		expect(sentKeys()).toEqual([`lot_won:example.com:${brazil}`]);
	});
});
