import { describe, it, expect } from 'vitest';
import { teamPoints, EXIT_STAGES } from '../../src/lib/server/scoring';

// v1.md: "If a team comes fourth in its group they get zero points. If they
// come third they get one. If they win but get knocked out immediately they
// get three points. If they win the overall competition there is some overall
// number of points they win that makes sense."
describe('teamPoints — group stage', () => {
	it('bottom of the group scores zero', () => {
		expect(teamPoints(4, null)).toBe(0);
	});

	it('climbs with group position', () => {
		expect(teamPoints(3, null)).toBe(1);
		expect(teamPoints(2, null)).toBe(2);
		expect(teamPoints(1, null)).toBe(3);
	});

	it('treats an unknown/empty group position as zero', () => {
		expect(teamPoints(null, null)).toBe(0);
	});
});

describe('teamPoints — knockout bonuses stack', () => {
	it('group winner knocked out immediately (R32 loss) keeps the group 3', () => {
		// "win but get knocked out immediately they get three points"
		expect(teamPoints(1, 'r32')).toBe(3);
	});

	it('each round survived adds its bonus on top', () => {
		expect(teamPoints(1, 'r16')).toBe(3 + 2); // won R32
		expect(teamPoints(1, 'qf')).toBe(3 + 2 + 3); // won R32, R16
		expect(teamPoints(1, 'sf')).toBe(3 + 2 + 3 + 4); // + QF
		expect(teamPoints(1, 'final')).toBe(3 + 2 + 3 + 4 + 5); // + SF
	});

	it('a group winner who wins the whole thing scores 25', () => {
		expect(teamPoints(1, 'champion')).toBe(25);
	});

	it('rewards a cheap qualifier: 2nd in group winning it all', () => {
		// The spec's "pick up Paraguay for nothing and they do well" case.
		expect(teamPoints(2, 'champion')).toBe(2 + 2 + 3 + 4 + 5 + 8); // 24
	});
});

describe('EXIT_STAGES metadata', () => {
	it('exposes every selectable knockout outcome for the admin UI', () => {
		expect(EXIT_STAGES.map((s) => s.value)).toEqual([
			'r32',
			'r16',
			'qf',
			'sf',
			'final',
			'champion'
		]);
	});
});
