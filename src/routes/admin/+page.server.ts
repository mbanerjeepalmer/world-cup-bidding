import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db, getSetting, setSetting } from '$lib/server/db';
import { syncFromFeed } from '$lib/server/sync';

export const load: PageServerLoad = () => {
	return {
		kickoff: getSetting('kickoff'),
		minOpeningBid: getSetting('min_opening_bid'),
		staggerMinutes: getSetting('stagger_minutes'),
		closeMarginMinutes: getSetting('close_margin_minutes'),
		users: db
			.prepare('SELECT id, email, name, is_admin, created_at FROM users ORDER BY created_at')
			.all() as { id: number; email: string; name: string; is_admin: number; created_at: string }[]
	};
};

export const actions: Actions = {
	settings: async ({ request }) => {
		const form = await request.formData();
		const kickoff = String(form.get('kickoff') ?? '').trim();
		const minBid = Number(form.get('min_opening_bid'));
		const stagger = Number(form.get('stagger_minutes'));
		const margin = Number(form.get('close_margin_minutes'));

		if (Number.isNaN(new Date(kickoff).getTime()))
			return fail(400, { error: 'Kickoff must be a valid ISO date-time, e.g. 2026-06-12T02:00:00Z.' });
		if (!Number.isInteger(minBid) || minBid <= 0)
			return fail(400, { error: 'Minimum opening bid must be a positive whole number.' });
		if (!Number.isInteger(stagger) || stagger <= 0)
			return fail(400, { error: 'Minutes between hammers must be a positive whole number.' });
		if (!Number.isInteger(margin) || margin <= 0)
			return fail(400, { error: 'Final-hammer margin must be a positive whole number of minutes.' });

		setSetting('kickoff', new Date(kickoff).toISOString());
		setSetting('min_opening_bid', String(minBid));
		setSetting('stagger_minutes', String(stagger));
		setSetting('close_margin_minutes', String(margin));
		return { success: 'Settings saved.' };
	},
	sync: async () => {
		const result = await syncFromFeed();
		if (!result.ok) return fail(502, { error: `Sync failed: ${result.error}` });
		const s = result.summary;
		return {
			success:
				`Synced ${s.teams} teams (${s.inserted.length} new, ${s.removed.length} retired), ` +
				`${s.groupsScored} groups scored, ${s.exitsApplied} knockout exits.`
		};
	},
	toggleAdmin: async ({ request, locals }) => {
		const form = await request.formData();
		const id = Number(form.get('id'));
		if (id === locals.user!.id) return fail(400, { error: 'You cannot demote yourself.' });
		db.prepare('UPDATE users SET is_admin = 1 - is_admin WHERE id = ?').run(id);
		return { success: 'Updated.' };
	}
};
