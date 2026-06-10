import { describe, it, expect, beforeEach } from 'vitest';
import { placeBid } from '../../src/lib/server/auction';
import { stateOfPlay } from '../../src/lib/server/scoring';
import { resetDb, makeUser, makeTeam, openAuction } from '../helpers';

beforeEach(() => {
	resetDb();
	openAuction();
});

describe('stateOfPlay — what every bid in the room needs to be worth it', () => {
	it('lists each lot with a high bid, with a score ladder priced at the winning bid', () => {
		const alice = makeUser('Alice');
		const bob = makeUser('Bob');
		const brazil = makeTeam('Brazil');
		const curacao = makeTeam('Curaçao');
		makeTeam('Unsold'); // no bids — not part of the state of play

		placeBid(brazil, alice, 1000);
		placeBid(curacao, bob, 10);

		const { lots } = stateOfPlay('example.com');
		expect(lots.map((l) => l.name).sort()).toEqual(['Brazil', 'Curaçao']);

		const brazilLot = lots.find((l) => l.name === 'Brazil')!;
		// Group standings unknown → assume runner-up, the conservative qualifier.
		expect(brazilLot.positionKnown).toBe(false);
		expect(brazilLot.assumedPosition).toBe(2);
		// Champions as a runner-up = 24 points; at 1,000 BonBons that scores 0.024.
		const top = brazilLot.ladder[brazilLot.ladder.length - 1];
		expect(top.points).toBe(24);
		expect(top.score).toBeCloseTo(0.024, 6);

		// The cheap lot's ladder is priced at 10, not 1,000.
		const curacaoTop = lots.find((l) => l.name === 'Curaçao')!.ladder.at(-1)!;
		expect(curacaoTop.score).toBeCloseTo(2.4, 6);
	});

	it('uses the real group position once standings are known', () => {
		const alice = makeUser('Alice');
		const brazil = makeTeam('Brazil', { group_position: 1 });
		placeBid(brazil, alice, 100);

		const lot = stateOfPlay('example.com').lots[0];
		expect(lot.positionKnown).toBe(true);
		expect(lot.assumedPosition).toBe(1);
		expect(lot.ladder.at(-1)!.points).toBe(25);
	});

	it('is tenant-private: another domain’s bids never appear, and prices stay per-room', () => {
		const alice = makeUser('Alice'); // example.com
		const rival = makeUser('Rival', 'rival@gmail.com');
		const brazil = makeTeam('Brazil');

		placeBid(brazil, alice, 1000);
		placeBid(brazil, rival, 10);

		const example = stateOfPlay('example.com');
		expect(example.lots).toHaveLength(1);
		expect(example.lots[0].high_bid).toBe(1000);
		expect(example.board.map((e) => e.name)).toEqual(['Alice']);

		const gmail = stateOfPlay('gmail.com');
		expect(gmail.lots[0].high_bid).toBe(10);
		expect(gmail.lots[0].ladder.at(-1)!.score).toBeCloseTo(2.4, 6);
		expect(gmail.board.map((e) => e.name)).toEqual(['Rival']);
	});

	it('includes the standings so the page can show the score to beat', () => {
		const alice = makeUser('Alice');
		const bob = makeUser('Bob');
		const brazil = makeTeam('Brazil', { group_position: 1, exit_stage: 'champion' }); // 25 pts
		const curacao = makeTeam('Curaçao', { group_position: 1, exit_stage: 'r32' }); // 3 pts

		placeBid(brazil, alice, 1000); // 0.025
		placeBid(curacao, bob, 10); // 0.3

		const { board } = stateOfPlay('example.com');
		expect(board.map((e) => e.name)).toEqual(['Bob', 'Alice']);
		expect(board[0].score).toBeCloseTo(0.3, 6);
	});
});
