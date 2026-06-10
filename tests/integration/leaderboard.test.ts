import { describe, it, expect, beforeEach } from 'vitest';
import { placeBid } from '../../src/lib/server/auction';
import { leaderboard } from '../../src/lib/server/scoring';
import { resetDb, makeUser, makeTeam, openAuction } from '../helpers';

beforeEach(() => {
	resetDb();
	openAuction();
});

describe('leaderboard — score is points ÷ price paid (v1 core mechanic)', () => {
	it('scores each owned team and ranks the better ratio first', () => {
		const overpayer = makeUser('Overpayer');
		const bargainHunter = makeUser('Bargain');

		// Overpayer buys the champion for a fortune.
		const brazil = makeTeam('Brazil', { group_position: 1, exit_stage: 'champion' }); // 25 pts
		// Bargain hunter grabs a cheap group winner who goes out immediately.
		const curacao = makeTeam('Curaçao', { group_position: 1, exit_stage: 'r32' }); // 3 pts

		placeBid(brazil, overpayer, 1000); // 25 / 1000 = 0.025
		placeBid(curacao, bargainHunter, 10); // 3 / 10 = 0.3

		const board = leaderboard();
		expect(board.map((e) => e.name)).toEqual(['Bargain', 'Overpayer']);

		const bargain = board.find((e) => e.name === 'Bargain')!;
		expect(bargain.points).toBe(3);
		expect(bargain.spent).toBe(10);
		expect(bargain.score).toBeCloseTo(0.3, 5);

		const over = board.find((e) => e.name === 'Overpayer')!;
		expect(over.score).toBeCloseTo(0.025, 5);
	});

	it('scores only the lot held at the close — one team per bidder', () => {
		const alice = makeUser('Alice');
		const bob = makeUser('Bob');
		const a = makeTeam('A', { group_position: 1, exit_stage: 'r32' }); // 3 pts
		const b = makeTeam('B', { group_position: 2, exit_stage: null }); // 2 pts

		// Alice leads A, Bob takes it, so Alice moves on to B.
		placeBid(a, alice, 10);
		placeBid(a, bob, 15);
		placeBid(b, alice, 40);

		const entry = leaderboard().find((e) => e.name === 'Alice')!;
		expect(entry.teams.map((t) => t.name)).toEqual(['B']);
		expect(entry.points).toBe(2);
		expect(entry.spent).toBe(40);
		expect(entry.score).toBeCloseTo(0.05, 5);
	});

	it('a bidder who only ever got outbid owns nothing and scores zero', () => {
		const alice = makeUser('Alice');
		const bob = makeUser('Bob');
		const brazil = makeTeam('Brazil', { group_position: 1, exit_stage: 'champion' });

		placeBid(brazil, alice, 10);
		placeBid(brazil, bob, 15); // Bob takes it

		const board = leaderboard();
		expect(board.find((e) => e.name === 'Bob')!.points).toBe(25);
		const aliceEntry = board.find((e) => e.name === 'Alice')!;
		expect(aliceEntry.teams).toHaveLength(0);
		expect(aliceEntry.score).toBe(0);
	});

	it('unsold teams score for nobody', () => {
		makeUser('Alice');
		makeTeam('Nobody', { group_position: 1, exit_stage: 'champion' }); // no bids
		const board = leaderboard();
		expect(board.every((e) => e.points === 0)).toBe(true);
	});
});
