import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { leaderboard } from '$lib/server/scoring';

export const load: PageServerLoad = ({ locals }) => {
	if (!locals.user) redirect(303, '/login');
	return { board: leaderboard() };
};
