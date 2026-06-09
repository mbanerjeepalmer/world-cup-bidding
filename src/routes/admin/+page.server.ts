import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db, getSetting, setSetting } from '$lib/server/db';

export const load: PageServerLoad = () => {
	return {
		kickoff: getSetting('kickoff'),
		budgetSetting: getSetting('budget'),
		minOpeningBid: getSetting('min_opening_bid'),
		users: db
			.prepare('SELECT id, email, name, is_admin, created_at FROM users ORDER BY created_at')
			.all() as { id: number; email: string; name: string; is_admin: number; created_at: string }[]
	};
};

export const actions: Actions = {
	settings: async ({ request }) => {
		const form = await request.formData();
		const kickoff = String(form.get('kickoff') ?? '').trim();
		const budget = Number(form.get('budget'));
		const minBid = Number(form.get('min_opening_bid'));

		if (Number.isNaN(new Date(kickoff).getTime()))
			return fail(400, { error: 'Kickoff must be a valid ISO date-time, e.g. 2026-06-12T02:00:00Z.' });
		if (!Number.isInteger(budget) || budget <= 0)
			return fail(400, { error: 'Budget must be a positive whole number.' });
		if (!Number.isInteger(minBid) || minBid <= 0)
			return fail(400, { error: 'Minimum opening bid must be a positive whole number.' });

		setSetting('kickoff', new Date(kickoff).toISOString());
		setSetting('budget', String(budget));
		setSetting('min_opening_bid', String(minBid));
		return { success: 'Settings saved.' };
	},
	toggleAdmin: async ({ request, locals }) => {
		const form = await request.formData();
		const id = Number(form.get('id'));
		if (id === locals.user!.id) return fail(400, { error: 'You cannot demote yourself.' });
		db.prepare('UPDATE users SET is_admin = 1 - is_admin WHERE id = ?').run(id);
		return { success: 'Updated.' };
	}
};
