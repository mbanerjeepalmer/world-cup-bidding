import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { listTeamsWithBids, minimumNextBid } from '$lib/server/auction';

export const load: PageServerLoad = ({ locals }) => {
	if (!locals.user) redirect(303, '/login');
	return {
		teams: listTeamsWithBids().map((t) => ({ ...t, next_bid: minimumNextBid(t.high_bid) }))
	};
};
