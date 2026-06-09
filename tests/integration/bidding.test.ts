import { describe, it, expect, beforeEach } from 'vitest';
import { placeBid, getTeamWithBid, committed } from '../../src/lib/server/auction';
import {
	resetDb,
	makeUser,
	makeTeam,
	openAuction,
	closeAuction,
	setBudget
} from '../helpers';

let alice: number;
let bob: number;
let brazil: number;

beforeEach(() => {
	resetDb();
	openAuction();
	setBudget(1000);
	alice = makeUser('Alice');
	bob = makeUser('Bob');
	brazil = makeTeam('Brazil');
});

describe('placeBid — happy path', () => {
	it('records an opening bid at the minimum and makes the bidder the high bidder', () => {
		expect(placeBid(brazil, alice, 10)).toEqual({ ok: true });
		const team = getTeamWithBid(brazil)!;
		expect(team.high_bid).toBe(10);
		expect(team.high_bidder_id).toBe(alice);
		expect(team.bid_count).toBe(1);
	});

	it('lets another bidder outbid at the next standard increment', () => {
		placeBid(brazil, alice, 10);
		expect(placeBid(brazil, bob, 15)).toEqual({ ok: true });
		expect(getTeamWithBid(brazil)!.high_bidder_id).toBe(bob);
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

describe('placeBid — auction close (v1: closes one hour before kickoff)', () => {
	it('refuses bids once the auction has closed', () => {
		closeAuction();
		expect(placeBid(brazil, alice, 10)).toEqual({
			ok: false,
			error: 'The auction has closed.'
		});
	});
});

describe('placeBid — budget and committed funds', () => {
	it('caps total commitments at the budget across multiple lots', () => {
		setBudget(1000);
		const argentina = makeTeam('Argentina');
		expect(placeBid(brazil, alice, 600).ok).toBe(true);
		// Only 400 left; a 500 bid must be refused.
		const r = placeBid(argentina, alice, 500);
		expect(r.ok).toBe(false);
		expect((r as { error: string }).error).toContain('exceeds your available funds');
		expect(committed(alice)).toBe(600);
	});

	it('frees committed funds when a bid is beaten', () => {
		placeBid(brazil, alice, 600);
		expect(committed(alice)).toBe(600);
		// Bob takes the lead; Alice's 600 is no longer committed.
		placeBid(brazil, bob, 650);
		expect(committed(alice)).toBe(0);
		expect(committed(bob)).toBe(650);
	});

	it('lets a bidder commit right up to the full budget', () => {
		expect(placeBid(brazil, alice, 1000).ok).toBe(true);
	});
});
