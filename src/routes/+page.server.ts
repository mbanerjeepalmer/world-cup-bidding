import type { PageServerLoad } from './$types';
import { listTeamsWithBids, leadingBids } from '$lib/server/auction';
import { leaderboard } from '$lib/server/scoring';
import { emailDomain } from '$lib/server/auth';

export const load: PageServerLoad = ({ locals }) => {
	// Signed out there is no tenant, so the sale shows no bids — just the schedule.
	const domain = locals.user ? emailDomain(locals.user.email) : '';
	const teams = listTeamsWithBids(domain);
	const hot = teams
		.filter((t) => t.bid_count > 0)
		.sort((a, b) => b.bid_count - a.bid_count || (b.high_bid ?? 0) - (a.high_bid ?? 0))
		.slice(0, 5);
	// listTeamsWithBids is in hammer order, so the first still-open lot is next
	// up and the final entry is the sale's last lot.
	const next = teams.find((t) => new Date(t.close_at) > new Date());
	const last = teams.at(-1);
	return {
		teamCount: teams.length,
		unsoldCount: teams.filter((t) => t.high_bid === null).length,
		nextHammer: next && { name: next.name, flag: next.flag, closeAt: next.close_at },
		lastHammer: last && { name: last.name, flag: last.flag, closeAt: last.close_at },
		hot,
		mine: locals.user ? leadingBids(locals.user.id) : [],
		top: locals.user ? leaderboard(domain).slice(0, 5) : []
	};
};
