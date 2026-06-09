import type { PageServerLoad } from './$types';
import { listTeamsWithBids, leadingBids } from '$lib/server/auction';
import { leaderboard } from '$lib/server/scoring';

export const load: PageServerLoad = ({ locals }) => {
	const teams = listTeamsWithBids();
	const hot = teams
		.filter((t) => t.bid_count > 0)
		.sort((a, b) => b.bid_count - a.bid_count || (b.high_bid ?? 0) - (a.high_bid ?? 0))
		.slice(0, 5);
	return {
		teamCount: teams.length,
		unsoldCount: teams.filter((t) => t.high_bid === null).length,
		hot,
		mine: locals.user ? leadingBids(locals.user.id) : [],
		top: leaderboard().slice(0, 5)
	};
};
