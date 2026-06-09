import type { LayoutServerLoad } from './$types';
import { auctionCloseTime, auctionOpen, budget, committed } from '$lib/server/auction';

export const load: LayoutServerLoad = ({ locals }) => {
	return {
		user: locals.user,
		auctionOpen: auctionOpen(),
		auctionClose: auctionCloseTime().toISOString(),
		budget: budget(),
		committed: locals.user ? committed(locals.user.id) : 0
	};
};
