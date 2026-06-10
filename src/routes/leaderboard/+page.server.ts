import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { leaderboard } from '$lib/server/scoring';
import { emailDomain } from '$lib/server/auth';

export const load: PageServerLoad = ({ locals }) => {
	if (!locals.user) redirect(303, '/login');
	const domain = emailDomain(locals.user.email);
	return { board: leaderboard(domain), domain };
};
