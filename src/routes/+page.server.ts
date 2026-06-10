import type { PageServerLoad } from './$types';
import { listTeamsWithBids, leadingBids } from '$lib/server/auction';
import { leaderboard } from '$lib/server/scoring';

export const load: PageServerLoad = ({ locals }) => {
	const teams = listTeamsWithBids();
	const hot = teams
		.filter((t) => t.bid_count > 0)
		.sort((a, b) => b.bid_count - a.bid_count || (b.high_bid ?? 0) - (a.high_bid ?? 0))
		.slice(0, 5);
	// listTeamsWithBids is in hammer order, so the first still-open lot is next up.
	const next = teams.find((t) => new Date(t.close_at) > new Date());
	return {
		teamCount: teams.length,
		unsoldCount: teams.filter((t) => t.high_bid === null).length,
		nextHammer: next && { name: next.name, flag: next.flag, closeAt: next.close_at },
		hot,
		mine: locals.user ? leadingBids(locals.user.id) : [],
		top: leaderboard().slice(0, 5)
	};
};
