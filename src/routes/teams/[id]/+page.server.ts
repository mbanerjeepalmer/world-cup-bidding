import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import {
	domainOf,
	getTeamWithBid,
	leadingBids,
	lotOpen,
	minimumNextBid,
	placeBid
} from '$lib/server/auction';
import { teamPoints } from '$lib/server/scoring';
import { emailDomain } from '$lib/server/auth';

export const load: PageServerLoad = ({ locals, params }) => {
	if (!locals.user) redirect(303, '/login');
	const domain = emailDomain(locals.user.email);
	const team = getTeamWithBid(Number(params.id), domain);
	if (!team) error(404, 'No such lot.');

	// Bid history is tenant-private: only bids from the viewer's domain.
	const history = db
		.prepare(
			`SELECT b.amount, b.created_at, u.name
			 FROM bids b JOIN users u ON u.id = b.user_id
			 WHERE b.team_id = ? AND ${domainOf('u.email')} = ? ORDER BY b.id DESC LIMIT 25`
		)
		.all(team.id, domain) as { amount: number; created_at: string; name: string }[];

	// One team per bidder: if the user leads a different lot they cannot bid here.
	const heldOther = leadingBids(locals.user.id).find((t) => t.id !== team.id) ?? null;

	return {
		team,
		lotOpen: lotOpen(team),
		history,
		points: teamPoints(team.group_position, team.exit_stage),
		nextBid: minimumNextBid(team.high_bid),
		heldOther: heldOther && {
			id: heldOther.id,
			name: heldOther.name,
			flag: heldOther.flag,
			closed: !lotOpen(heldOther)
		}
	};
};

export const actions: Actions = {
	bid: async ({ locals, params, request }) => {
		if (!locals.user) redirect(303, '/login');

		const form = await request.formData();
		const amount = Number(form.get('amount'));
		const result = placeBid(Number(params.id), locals.user.id, amount);
		if (!result.ok) return fail(400, { error: result.error, amount: form.get('amount') });
		return { success: `Bid placed: ${amount} BonBons.` };
	}
};
