import { db } from './db';
import { listTeamsWithBids, type TeamWithBid } from './auction';

// Group stage points (groups of four), per v1.md: fourth scores nothing,
// third scores one, and the group winner scores 3 — so a team that wins its
// group and is knocked out immediately finishes on 3 points.
const GROUP_POINTS: Record<number, number> = { 4: 0, 3: 1, 2: 2, 1: 3 };

// Each knockout match won adds points on top, climbing with the round and a
// premium for the final itself. A team that tops its group and wins the whole
// tournament scores 3 + 2 + 3 + 4 + 5 + 8 = 25.
const KNOCKOUT_WIN_POINTS = { r32: 2, r16: 3, qf: 4, sf: 5, final: 8 };

export const EXIT_STAGES = [
	{ value: 'r32', label: 'Out in Round of 32' },
	{ value: 'r16', label: 'Out in Round of 16' },
	{ value: 'qf', label: 'Out in Quarter-finals' },
	{ value: 'sf', label: 'Out in Semi-finals' },
	{ value: 'final', label: 'Runners-up' },
	{ value: 'champion', label: 'Champions' }
] as const;

/** Tournament points for a team given its group position and how far it got. */
export function teamPoints(groupPosition: number | null, exitStage: string | null): number {
	let points = groupPosition !== null ? (GROUP_POINTS[groupPosition] ?? 0) : 0;
	if (!exitStage) return points;
	// Points for each knockout round the team won before (or including) its exit.
	if (['r16', 'qf', 'sf', 'final', 'champion'].includes(exitStage))
		points += KNOCKOUT_WIN_POINTS.r32;
	if (['qf', 'sf', 'final', 'champion'].includes(exitStage)) points += KNOCKOUT_WIN_POINTS.r16;
	if (['sf', 'final', 'champion'].includes(exitStage)) points += KNOCKOUT_WIN_POINTS.qf;
	if (['final', 'champion'].includes(exitStage)) points += KNOCKOUT_WIN_POINTS.sf;
	if (exitStage === 'champion') points += KNOCKOUT_WIN_POINTS.final;
	return points;
}

export type ScoredTeam = TeamWithBid & { points: number; score: number };

export type LeaderboardEntry = {
	user_id: number;
	name: string;
	teams: ScoredTeam[];
	spent: number;
	points: number;
	score: number;
};

/**
 * Once the auction closes, every team's high bidder owns it at their bid
 * price. The score for a team is points ÷ price; a player's total is the sum
 * across the teams they own.
 */
export function leaderboard(): LeaderboardEntry[] {
	const users = db.prepare('SELECT id, name FROM users ORDER BY name').all() as {
		id: number;
		name: string;
	}[];
	const teams = listTeamsWithBids();

	const entries = users.map((u) => {
		const owned = teams
			.filter((t) => t.high_bidder_id === u.id)
			.map((t) => {
				const points = teamPoints(t.group_position, t.exit_stage);
				return { ...t, points, score: t.high_bid ? points / t.high_bid : 0 };
			});
		return {
			user_id: u.id,
			name: u.name,
			teams: owned,
			spent: owned.reduce((s, t) => s + (t.high_bid ?? 0), 0),
			points: owned.reduce((s, t) => s + t.points, 0),
			score: owned.reduce((s, t) => s + t.score, 0)
		};
	});

	return entries.sort((a, b) => b.score - a.score || b.points - a.points);
}
