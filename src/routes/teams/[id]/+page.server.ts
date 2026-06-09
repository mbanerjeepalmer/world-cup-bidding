import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import {
	auctionOpen,
	budget,
	committed,
	getTeamWithBid,
	minimumNextBid,
	placeBid
} from '$lib/server/auction';
import { teamPoints } from '$lib/server/scoring';

export const load: PageServerLoad = ({ locals, params }) => {
	if (!locals.user) redirect(303, '/login');
	const team = getTeamWithBid(Number(params.id));
	if (!team) error(404, 'No such lot.');

	const history = db
		.prepare(
			`SELECT b.amount, b.created_at, u.name
			 FROM bids b JOIN users u ON u.id = b.user_id
			 WHERE b.team_id = ? ORDER BY b.id DESC LIMIT 25`
		)
		.all(team.id) as { amount: number; created_at: string; name: string }[];

	return {
		team,
		history,
		points: teamPoints(team.group_position, team.exit_stage),
		nextBid: minimumNextBid(team.high_bid),
		available: budget() - committed(locals.user.id, team.id)
	};
};

export const actions: Actions = {
	bid: async ({ locals, params, request }) => {
		if (!locals.user) redirect(303, '/login');
		if (!auctionOpen()) return fail(400, { error: 'The auction has closed.' });

		const form = await request.formData();
		const amount = Number(form.get('amount'));
		const result = placeBid(Number(params.id), locals.user.id, amount);
		if (!result.ok) return fail(400, { error: result.error, amount: form.get('amount') });
		return { success: `Bid placed: ${amount} BonBons.` };
	}
};
