import { describe, it, expect, beforeEach } from 'vitest';
import { placeBid, getTeamWithBid, leadingBids } from '../../src/lib/server/auction';
import { setSetting } from '../../src/lib/server/db';
import { resetDb, makeUser, makeTeam, openAuction, closeAuction } from '../helpers';

let alice: number;
let bob: number;
let brazil: number;

beforeEach(() => {
	resetDb();
	openAuction();
	alice = makeUser('Alice');
	bob = makeUser('Bob');
	brazil = makeTeam('Brazil');
});

describe('placeBid — happy path', () => {
	it('records an opening bid at the minimum and makes the bidder the high bidder', () => {
		expect(placeBid(brazil, alice, 10)).toEqual({ ok: true, outbid: null });
		const team = getTeamWithBid(brazil, 'example.com')!;
		expect(team.high_bid).toBe(10);
		expect(team.high_bidder_id).toBe(alice);
		expect(team.bid_count).toBe(1);
	});

	it('lets another bidder outbid at the next standard increment, naming the deposed bidder', () => {
		placeBid(brazil, alice, 10);
		expect(placeBid(brazil, bob, 15)).toEqual({
			ok: true,
			outbid: { email: 'alice@example.com', name: 'Alice' }
		});
		expect(getTeamWithBid(brazil, 'example.com')!.high_bidder_id).toBe(bob);
	});
});

describe('placeBid — validation', () => {
	it('rejects a bid below the opening minimum', () => {
		const r = placeBid(brazil, alice, 5);
		expect(r).toEqual({ ok: false, error: 'The minimum bid is 10 BonBons.' });
	});

	it('rejects a raise that does not clear the next increment', () => {
		placeBid(brazil, alice, 10); // next minimum is 15
		const r = placeBid(brazil, bob, 12);
		expect(r).toEqual({ ok: false, error: 'The minimum bid is 15 BonBons.' });
	});

	it('refuses to let the standing high bidder bid against themselves', () => {
		placeBid(brazil, alice, 10);
		const r = placeBid(brazil, alice, 20);
		expect(r).toEqual({
			ok: false,
			error: 'You already hold the high bid on this team.'
		});
	});

	it('rejects non-integer or non-positive amounts', () => {
		expect(placeBid(brazil, alice, 10.5).ok).toBe(false);
		expect(placeBid(brazil, alice, 0).ok).toBe(false);
		expect(placeBid(brazil, alice, -5).ok).toBe(false);
	});

	it('rejects bids on an unknown lot', () => {
		expect(placeBid(99999, alice, 10)).toEqual({ ok: false, error: 'Unknown team.' });
	});
});

describe('placeBid — staggered hammer (last lot two hours before kickoff)', () => {
	it('refuses bids once a lot has been hammered', () => {
		closeAuction();
		expect(placeBid(brazil, alice, 10)).toEqual({
			ok: false,
			error: 'The hammer has fallen on this lot.'
		});
	});

	it('closes lots one at a time in running order', () => {
		// Same group, so Argentina is hammered 5 minutes (the default stagger)
		// before Brazil. Pick a kickoff that puts us between the two hammers:
		// the final hammer (Brazil) is 2.5 minutes away, Argentina fell 2.5
		// minutes ago.
		const argentina = makeTeam('Argentina');
		setSetting('kickoff', new Date(Date.now() + 122.5 * 60_000).toISOString());

		expect(placeBid(argentina, alice, 10)).toEqual({
			ok: false,
			error: 'The hammer has fallen on this lot.'
		});
		expect(placeBid(brazil, alice, 10)).toEqual({ ok: true, outbid: null });
	});

	it('locks the winner of a hammered lot out of the rest of the sale', () => {
		const argentina = makeTeam('Argentina');
		placeBid(argentina, alice, 10); // everything still open
		// Argentina's hammer falls; Brazil remains open.
		setSetting('kickoff', new Date(Date.now() + 122.5 * 60_000).toISOString());

		const r = placeBid(brazil, alice, 10);
		expect(r.ok).toBe(false);
		expect((r as { error: string }).error).toContain('Argentina is your team');
		// Bob is still free to fight for Brazil.
		expect(placeBid(brazil, bob, 10)).toEqual({ ok: true, outbid: null });
	});
});

describe('placeBid — one team per bidder', () => {
	it('refuses a bid on a second lot while leading another', () => {
		const argentina = makeTeam('Argentina');
		expect(placeBid(brazil, alice, 10).ok).toBe(true);
		const r = placeBid(argentina, alice, 10);
		expect(r.ok).toBe(false);
		expect((r as { error: string }).error).toContain('one team per bidder');
		expect((r as { error: string }).error).toContain('Brazil');
	});

	it('frees the bidder to go elsewhere once outbid', () => {
		const argentina = makeTeam('Argentina');
		placeBid(brazil, alice, 10);
		placeBid(brazil, bob, 15); // Bob takes Brazil from Alice
		expect(placeBid(argentina, alice, 10)).toEqual({ ok: true, outbid: null });
		expect(leadingBids(alice).map((t) => t.name)).toEqual(['Argentina']);
	});

	it('accepts an arbitrarily large bid — there is no budget, the ratio is the brake', () => {
		expect(placeBid(brazil, alice, 1_000_000)).toEqual({ ok: true, outbid: null });
	});
});
