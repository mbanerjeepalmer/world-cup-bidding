import { error, redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals }) => {
	if (!locals.user) redirect(303, '/login');
	if (!locals.user.is_admin) error(403, 'Auctioneers only.');
};
