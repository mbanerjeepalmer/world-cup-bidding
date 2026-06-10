import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { listTeamsWithBids } from '$lib/server/auction';
import { teamPoints } from '$lib/server/scoring';
import { emailDomain } from '$lib/server/auth';

export const load: PageServerLoad = ({ locals }) => {
	if (!locals.user) redirect(303, '/login');
	const userId = locals.user.id;

	const teams = listTeamsWithBids(emailDomain(locals.user.email));
	const leading = teams
		.filter((t) => t.high_bidder_id === userId)
		.map((t) => {
			const points = teamPoints(t.group_position, t.exit_stage);
			return { ...t, points, score: t.high_bid ? points / t.high_bid : 0 };
		});

	// Lots where the user has bid but been outbid.
	const outbid = db
		.prepare(
			`SELECT DISTINCT t.id, t.name, t.flag FROM bids b
			 JOIN teams t ON t.id = b.team_id
			 WHERE b.user_id = ? ORDER BY t.name`
		)
		.all(userId)
		.filter((t: any) => !leading.some((l) => l.id === t.id)) as {
		id: number;
		name: string;
		flag: string;
	}[];

	return { leading, outbid };
};
