import { describe, it, expect, beforeEach } from 'vitest';
import { db, getSetting } from '../../src/lib/server/db';
import { syncFromData, type Feed } from '../../src/lib/server/sync';
import { placeBid } from '../../src/lib/server/auction';
import { resetDb, makeUser, makeTeam, openAuction } from '../helpers';

// Group A fully played; Group B not started; a knockout run that crowns
// Mexico champion, including a penalty shoot-out and a third-place match.
const FEED: Feed = {
	name: 'World Cup 2026',
	matches: [
		// — Group A (final table: Mexico 9, South Korea 4, Czech Republic 2, South Africa 1)
		{ round: 'Matchday 1', date: '2026-06-11', time: '13:00 UTC-6', group: 'Group A', team1: 'Mexico', team2: 'South Africa', score1: 2, score2: 0 },
		{ round: 'Matchday 1', date: '2026-06-12', group: 'Group A', team1: 'South Korea', team2: 'Czech Republic', score1: 1, score2: 1 },
		{ round: 'Matchday 2', date: '2026-06-17', group: 'Group A', team1: 'Mexico', team2: 'South Korea', score1: 3, score2: 1 },
		{ round: 'Matchday 2', date: '2026-06-17', group: 'Group A', team1: 'Czech Republic', team2: 'South Africa', score1: 0, score2: 0 },
		{ round: 'Matchday 3', date: '2026-06-22', group: 'Group A', team1: 'Mexico', team2: 'Czech Republic', score1: 1, score2: 0 },
		{ round: 'Matchday 3', date: '2026-06-22', group: 'Group A', team1: 'South Korea', team2: 'South Africa', score1: 2, score2: 1 },
		// — Group B, nothing played yet ("USA" must match our "United States" lot)
		{ round: 'Matchday 1', date: '2026-06-13', group: 'Group B', team1: 'USA', team2: 'Paraguay' },
		{ round: 'Matchday 2', date: '2026-06-18', group: 'Group B', team1: 'Australia', team2: 'Turkey' },
		// — Knockouts
		{ round: 'Round of 32', date: '2026-06-29', team1: 'Mexico', team2: 'South Korea', score1: 2, score2: 1 },
		{ round: 'Round of 32', date: '2026-06-29', team1: 'W39', team2: 'W40' }, // unplayed placeholder tie
		{ round: 'Round of 16', date: '2026-07-03', team1: 'Mexico', team2: 'Paraguay', score1: 1, score2: 1, score1p: 4, score2p: 3 },
		{ round: 'Quarter-final', date: '2026-07-09', team1: 'Mexico', team2: 'Australia', score1: 2, score2: 0 },
		{ round: 'Semi-final', date: '2026-07-14', team1: 'Mexico', team2: 'USA', score1: 1, score2: 0 },
		{ round: 'Match for third place', date: '2026-07-18', team1: 'USA', team2: 'Uzbekistan', score1: 2, score2: 0 },
		{ round: 'Final', date: '2026-07-19', time: '15:00 UTC-4', team1: 'Mexico', team2: 'Turkey', score1: 3, score2: 1 }
	]
};

// Uzbekistan plays the 3rd-place match but needs to be in the roster: give it
// a group fixture so the feed stays internally consistent.
FEED.matches.push({ round: 'Matchday 1', date: '2026-06-14', group: 'Group B', team1: 'Uzbekistan', team2: 'Scotland' });

const team = (name: string) =>
	db
		.prepare('SELECT name, flag, group_name, group_position, exit_stage FROM teams WHERE name = ?')
		.get(name) as
		| { name: string; flag: string; group_name: string; group_position: number | null; exit_stage: string | null }
		| undefined;

beforeEach(() => {
	resetDb();
	openAuction();
});

describe('syncFromData — fixtures (teams and groups)', () => {
	it('inserts the roster with group assignments', () => {
		const summary = syncFromData(FEED);
		expect(summary.teams).toBe(10);
		expect(team('Mexico')?.group_name).toBe('A');
		expect(team('Paraguay')?.group_name).toBe('B');
	});

	it('matches feed "USA" to our "United States" lot instead of duplicating', () => {
		makeTeam('United States');
		syncFromData(FEED);
		expect(team('USA')).toBeUndefined();
		expect(team('United States')?.group_name).toBe('B');
	});

	it('retires play-off placeholder lots nobody bid on, but keeps bid ones', () => {
		makeTeam('UEFA Play-off Winner A');
		const keeper = makeTeam('Inter-confederation Play-off Winner 1');
		const alice = makeUser('Alice');
		placeBid(keeper, alice, 10);

		const summary = syncFromData(FEED);
		expect(summary.removed).toContain('UEFA Play-off Winner A');
		expect(team('UEFA Play-off Winner A')).toBeUndefined();
		expect(team('Inter-confederation Play-off Winner 1')).toBeDefined();
	});
});

describe('syncFromData — results (standings and exits)', () => {
	it('computes group positions from played matches (points, GD, goals)', () => {
		syncFromData(FEED);
		expect(team('Mexico')?.group_position).toBe(1);
		expect(team('South Korea')?.group_position).toBe(2);
		expect(team('Czech Republic')?.group_position).toBe(3);
		expect(team('South Africa')?.group_position).toBe(4);
	});

	it('leaves positions null in groups with no results yet', () => {
		syncFromData(FEED);
		expect(team('Paraguay')?.group_position).toBeNull();
		expect(team('Turkey')?.group_position).toBeNull();
	});

	it('sets exit stages from knockout losses, with penalties deciding draws', () => {
		syncFromData(FEED);
		expect(team('South Korea')?.exit_stage).toBe('r32');
		expect(team('Paraguay')?.exit_stage).toBe('r16'); // lost the shoot-out
		expect(team('Australia')?.exit_stage).toBe('qf');
		// Feed "USA" is stored under our lot name "United States".
		expect(team('United States')?.exit_stage).toBe('sf');
		expect(team('Turkey')?.exit_stage).toBe('final');
		expect(team('Mexico')?.exit_stage).toBe('champion');
	});

	it('the third-place match never overwrites an exit stage', () => {
		syncFromData(FEED);
		// USA lost the semi, then won the 3rd-place match — still out at the semis.
		expect(team('United States')?.exit_stage).toBe('sf');
		expect(team('Uzbekistan')?.exit_stage).toBeNull();
	});

	it('is idempotent: a second run reproduces the same state', () => {
		syncFromData(FEED);
		const before = db.prepare('SELECT * FROM teams ORDER BY name').all();
		syncFromData(FEED);
		expect(db.prepare('SELECT * FROM teams ORDER BY name').all()).toEqual(before);
	});

	it('overwrites stale manual results — the feed is the source of truth', () => {
		syncFromData(FEED);
		db.prepare("UPDATE teams SET exit_stage = 'champion' WHERE name = 'Australia'").run();
		syncFromData(FEED);
		expect(team('Australia')?.exit_stage).toBe('qf');
	});
});

describe('syncFromData — kickoff (auction close follows the fixtures)', () => {
	it('sets the kickoff setting from the earliest fixture, parsing the UTC offset', () => {
		const summary = syncFromData(FEED);
		expect(summary.kickoff).toBe('2026-06-11T19:00:00.000Z'); // 13:00 UTC-6
		expect(getSetting('kickoff')).toBe('2026-06-11T19:00:00.000Z');
	});
});
