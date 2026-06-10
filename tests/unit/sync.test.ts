import { describe, it, expect } from 'vitest';
import { matchKickoff, knockoutStage } from '../../src/lib/server/sync';

describe('matchKickoff — feed times carry a UTC offset', () => {
	it('converts local time + offset to UTC', () => {
		expect(matchKickoff('2026-06-11', '13:00 UTC-6').toISOString()).toBe(
			'2026-06-11T19:00:00.000Z'
		);
		expect(matchKickoff('2026-07-19', '15:00 UTC-4').toISOString()).toBe(
			'2026-07-19T19:00:00.000Z'
		);
	});

	it('handles positive offsets and crossing midnight', () => {
		expect(matchKickoff('2026-06-11', '01:00 UTC+3').toISOString()).toBe(
			'2026-06-10T22:00:00.000Z'
		);
		expect(matchKickoff('2026-06-11', '20:00 UTC-6').toISOString()).toBe(
			'2026-06-12T02:00:00.000Z'
		);
	});

	it('defaults to midday UTC when the time is missing or unparseable', () => {
		expect(matchKickoff('2026-06-11').toISOString()).toBe('2026-06-11T12:00:00.000Z');
		expect(matchKickoff('2026-06-11', 'TBC').toISOString()).toBe('2026-06-11T12:00:00.000Z');
	});
});

describe('knockoutStage — feed round names map to exit stages', () => {
	it('recognises every scored knockout round', () => {
		expect(knockoutStage('Round of 32')).toBe('r32');
		expect(knockoutStage('Round of 16')).toBe('r16');
		expect(knockoutStage('Quarter-final')).toBe('qf');
		expect(knockoutStage('Semi-final')).toBe('sf');
		expect(knockoutStage('Final')).toBe('final');
	});

	it('ignores the third-place match and group matchdays', () => {
		expect(knockoutStage('Match for third place')).toBeNull();
		expect(knockoutStage('Third place play-off')).toBeNull();
		expect(knockoutStage('Matchday 3')).toBeNull();
	});

	it('does not mistake a semi-final for the final', () => {
		expect(knockoutStage('Semi-finals')).toBe('sf');
	});
});
