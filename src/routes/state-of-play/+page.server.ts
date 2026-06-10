import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { stateOfPlay } from '$lib/server/scoring';
import { emailDomain } from '$lib/server/auth';
import { neededOutcome, pointsNeededToBeat } from '$lib/points';

export const load: PageServerLoad = ({ locals }) => {
	if (!locals.user) redirect(303, '/login');
	const domain = emailDomain(locals.user.email);
	const { board, lots } = stateOfPlay(domain);

	// The viewer's own lot, and the bar it must clear to top the room: beat
	// the best score any rival holds right now. Before results land everyone
	// sits on zero, so a single point puts you in front — the grid below is
	// where the real what-if comparisons live.
	const mine = lots.find((l) => l.high_bidder_id === locals.user!.id) ?? null;
	const bestRival = board.find((e) => e.user_id !== locals.user!.id) ?? null;
	const need =
		mine && bestRival
			? {
					rivalName: bestRival.name,
					rivalScore: bestRival.score,
					points: pointsNeededToBeat(mine.high_bid!, bestRival.score),
					outcome: neededOutcome(
						pointsNeededToBeat(mine.high_bid!, bestRival.score),
						mine.assumedPosition
					)
				}
			: null;

	return { domain, board, lots, mine, need };
};
