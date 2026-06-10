import type { LayoutServerLoad } from './$types';
import { auctionOpen, lastHammerTime, leadingBids } from '$lib/server/auction';

export const load: LayoutServerLoad = ({ locals }) => {
	const held = locals.user ? (leadingBids(locals.user.id)[0] ?? null) : null;
	return {
		user: locals.user,
		auctionOpen: auctionOpen(),
		// When the final lot is hammered — lots close one at a time before this.
		auctionClose: lastHammerTime().toISOString(),
		// One team per bidder — the lot this user currently leads, if any.
		held: held && { id: held.id, name: held.name, flag: held.flag, bid: held.high_bid }
	};
};
