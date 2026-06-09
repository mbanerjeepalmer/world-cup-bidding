import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { createSession, verifyPassword } from '$lib/server/auth';

export const load: PageServerLoad = ({ locals }) => {
	if (locals.user) redirect(303, '/');
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const form = await request.formData();
		const email = String(form.get('email') ?? '').trim().toLowerCase();
		const password = String(form.get('password') ?? '');

		const user = db
			.prepare('SELECT id, password_hash FROM users WHERE email = ?')
			.get(email) as { id: number; password_hash: string } | undefined;

		if (!user || !verifyPassword(password, user.password_hash))
			return fail(400, { email, error: 'Email or password not recognised.' });

		createSession(cookies, user.id);
		redirect(303, '/');
	}
};
