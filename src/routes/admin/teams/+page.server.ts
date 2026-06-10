import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { listTeamsWithBids } from '$lib/server/auction';
import { teamPoints } from '$lib/server/scoring';
import { emailDomain } from '$lib/server/auth';

const VALID_STAGES = ['', 'r32', 'r16', 'qf', 'sf', 'final', 'champion'];

export const load: PageServerLoad = ({ locals }) => {
	// Results are global; any bid data shown reflects the admin's own tenant.
	return {
		teams: listTeamsWithBids(locals.user ? emailDomain(locals.user.email) : '').map((t) => ({
			...t,
			points: teamPoints(t.group_position, t.exit_stage)
		}))
	};
};

export const actions: Actions = {
	update: async ({ request }) => {
		const form = await request.formData();
		const id = Number(form.get('id'));
		const name = String(form.get('name') ?? '').trim();
		const flag = String(form.get('flag') ?? '').trim();
		const group = String(form.get('group_name') ?? '').trim() || 'TBD';
		const positionRaw = String(form.get('group_position') ?? '');
		const exitStage = String(form.get('exit_stage') ?? '');

		if (!name) return fail(400, { error: 'Team name is required.', id });
		const position = positionRaw === '' ? null : Number(positionRaw);
		if (position !== null && (!Number.isInteger(position) || position < 1 || position > 4))
			return fail(400, { error: 'Group position must be 1–4.', id });
		if (!VALID_STAGES.includes(exitStage))
			return fail(400, { error: 'Invalid knockout result.', id });

		db.prepare(
			`UPDATE teams SET name = ?, flag = ?, group_name = ?, group_position = ?, exit_stage = ?
			 WHERE id = ?`
		).run(name, flag, group, position, exitStage === '' ? null : exitStage, id);

		return { success: 'Saved.', id };
	}
};
