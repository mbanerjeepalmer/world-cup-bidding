import { describe, it, expect, beforeEach } from 'vitest';
import { placeBid } from '../../src/lib/server/auction';
import { leaderboard } from '../../src/lib/server/scoring';
import { resetDb, makeUser, makeTeam, openAuction, setBudget } from '../helpers';

beforeEach(() => {
	resetDb();
	openAuction();
	setBudget(1000);
});

describe('leaderboard — score is points ÷ price paid (v1 core mechanic)', () => {
	it('scores each owned team and ranks the better ratio first', () => {
		const overpayer = makeUser('Overpayer');
		const bargainHunter = makeUser('Bargain');

		// Overpayer buys the champion for a fortune.
		const brazil = makeTeam('Brazil', { group_position: 1, exit_stage: 'champion' }); // 50 pts
		// Bargain hunter grabs a cheap group winner who goes out immediately.
		const curacao = makeTeam('Curaçao', { group_position: 1, exit_stage: 'r32' }); // 6 pts

		placeBid(brazil, overpayer, 1000); // 50 / 1000 = 0.05
		placeBid(curacao, bargainHunter, 10); // 6 / 10 = 0.6

		const board = leaderboard();
		expect(board.map((e) => e.name)).toEqual(['Bargain', 'Overpayer']);

		const bargain = board.find((e) => e.name === 'Bargain')!;
		expect(bargain.points).toBe(6);
		expect(bargain.spent).toBe(10);
		expect(bargain.score).toBeCloseTo(0.6, 5);

		const over = board.find((e) => e.name === 'Overpayer')!;
		expect(over.score).toBeCloseTo(0.05, 5);
	});

	it('sums score across every team a bidder owns', () => {
		const alice = makeUser('Alice');
		const a = makeTeam('A', { group_position: 1, exit_stage: 'r32' }); // 6 pts
		const b = makeTeam('B', { group_position: 2, exit_stage: null }); // 3 pts

		placeBid(a, alice, 10); // 0.6
		placeBid(b, alice, 30); // 0.1

		const entry = leaderboard().find((e) => e.name === 'Alice')!;
		expect(entry.teams).toHaveLength(2);
		expect(entry.points).toBe(9);
		expect(entry.spent).toBe(40);
		expect(entry.score).toBeCloseTo(0.7, 5);
	});

	it('a bidder who only ever got outbid owns nothing and scores zero', () => {
		const alice = makeUser('Alice');
		const bob = makeUser('Bob');
		const brazil = makeTeam('Brazil', { group_position: 1, exit_stage: 'champion' });

		placeBid(brazil, alice, 10);
		placeBid(brazil, bob, 15); // Bob takes it

		const board = leaderboard();
		expect(board.find((e) => e.name === 'Bob')!.points).toBe(50);
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
