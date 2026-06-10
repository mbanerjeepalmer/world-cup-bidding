import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { consumeLoginToken, createSession, peekLoginToken } from '$lib/server/auth';

// The emailed link lands on a confirmation page rather than signing in on GET:
// corporate mail scanners prefetch URLs, and a GET that spent the single-use
// token would lock the real reader out.
export const load: PageServerLoad = ({ params }) => {
	const token = peekLoginToken(params.token);
	return { valid: token !== null, email: token?.email ?? null };
};

export const actions: Actions = {
	default: async ({ params, cookies }) => {
		const token = consumeLoginToken(params.token);
		if (!token)
			return fail(400, { error: 'That link has expired or was already used — request a fresh one.' });

		let user = db.prepare('SELECT id FROM users WHERE email = ?').get(token.email) as
			| { id: number }
			| undefined;
		if (!user) {
			// The first person through the door runs the auction house.
			const count = (db.prepare('SELECT COUNT(*) AS n FROM users').get() as { n: number }).n;
			const result = db
				.prepare('INSERT INTO users (email, name, is_admin) VALUES (?, ?, ?)')
				.run(token.email, token.name ?? token.email.split('@')[0], count === 0 ? 1 : 0);
			user = { id: Number(result.lastInsertRowid) };
		}
		createSession(cookies, user.id);
		redirect(303, '/');
	}
};
