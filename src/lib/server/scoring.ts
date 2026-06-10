import { db } from './db';
import { domainOf, listTeamsWithBids, type TeamWithBid } from './auction';
import { teamPoints, outcomeLadder, type OutcomeRung } from '../points';

// The pure scoring math lives in $lib/points so the in-browser calculator can
// share it; re-exported here so server callers keep one import site.
export { teamPoints, EXIT_STAGES } from '../points';

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
 * across the teams they own. Each email domain is a separate tenant: its
 * leaderboard contains only that domain's bidders, scored against that
 * domain's own sale.
 */
export function leaderboard(domain: string): LeaderboardEntry[] {
	const users = db
		.prepare(`SELECT id, name FROM users WHERE ${domainOf('email')} = ? ORDER BY name`)
		.all(domain) as { id: number; name: string }[];
	const teams = listTeamsWithBids(domain);

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

export type StateOfPlayLot = TeamWithBid & {
	positionKnown: boolean;
	assumedPosition: number;
	currentPoints: number;
	currentScore: number;
	ladder: (OutcomeRung & { score: number })[];
};

/**
 * The state of play for one tenant's room: the standings, and every lot with
 * a high bid carrying its outcome ladder — what each possible tournament
 * result would score at the price actually paid. Until the group standings
 * are known a lot is assumed to qualify as runner-up, the conservative case.
 */
export function stateOfPlay(domain: string): { board: LeaderboardEntry[]; lots: StateOfPlayLot[] } {
	const lots = listTeamsWithBids(domain)
		.filter((t) => t.high_bid !== null)
		.map((t) => {
			const assumedPosition = t.group_position ?? 2;
			const currentPoints = teamPoints(t.group_position, t.exit_stage);
			return {
				...t,
				positionKnown: t.group_position !== null,
				assumedPosition,
				currentPoints,
				currentScore: currentPoints / t.high_bid!,
				ladder: outcomeLadder(assumedPosition).map((r) => ({
					...r,
					score: r.points / t.high_bid!
				}))
			};
		});
	return { board: leaderboard(domain), lots };
}
