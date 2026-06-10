import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { listTeamsWithBids, minimumNextBid } from '$lib/server/auction';
import { emailDomain } from '$lib/server/auth';

export const load: PageServerLoad = ({ locals }) => {
	if (!locals.user) redirect(303, '/login');
	return {
		teams: listTeamsWithBids(emailDomain(locals.user.email)).map((t) => ({
			...t,
			next_bid: minimumNextBid(t.high_bid)
		}))
	};
};
