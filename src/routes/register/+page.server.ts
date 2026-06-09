import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { createSession, emailAllowed, hashPassword } from '$lib/server/auth';

export const load: PageServerLoad = ({ locals }) => {
	if (locals.user) redirect(303, '/');
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const form = await request.formData();
		const email = String(form.get('email') ?? '').trim().toLowerCase();
		const name = String(form.get('name') ?? '').trim();
		const password = String(form.get('password') ?? '');

		if (!emailAllowed(email))
			return fail(400, { email, name, error: 'Registration is limited to bonhams.com addresses.' });
		if (!name) return fail(400, { email, name, error: 'Please give us a name for the paddle.' });
		if (password.length < 8)
			return fail(400, { email, name, error: 'Passwords must be at least 8 characters.' });

		const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
		if (existing)
			return fail(400, { email, name, error: 'That address already holds a paddle. Sign in instead.' });

		// The first person through the door runs the auction house.
		const userCount = (db.prepare('SELECT COUNT(*) AS n FROM users').get() as { n: number }).n;
		const result = db
			.prepare('INSERT INTO users (email, name, password_hash, is_admin) VALUES (?, ?, ?, ?)')
			.run(email, name, hashPassword(password), userCount === 0 ? 1 : 0);

		createSession(cookies, Number(result.lastInsertRowid));
		redirect(303, '/');
	}
};
