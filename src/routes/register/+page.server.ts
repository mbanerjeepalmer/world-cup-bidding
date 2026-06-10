import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { createLoginToken, emailValid } from '$lib/server/auth';
import { echoMagicLinks, sendMagicLink } from '$lib/server/email';

export const load: PageServerLoad = ({ locals }) => {
	if (locals.user) redirect(303, '/');
};

export const actions: Actions = {
	default: async ({ request, url }) => {
		const form = await request.formData();
		const email = String(form.get('email') ?? '').trim().toLowerCase();
		const name = String(form.get('name') ?? '').trim();

		if (!emailValid(email))
			return fail(400, { email, name, error: 'Please enter a valid email address.' });
		if (!name) return fail(400, { email, name, error: 'Please give us a name for the paddle.' });

		// An address that already holds a paddle just gets a sign-in link — the
		// account (and the first-registrant-becomes-admin check) is created when
		// the link is confirmed, not here.
		const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
		const link = `${url.origin}/auth/${createLoginToken(email, existing ? null : name)}`;
		const result = await sendMagicLink(email, link);
		if (!result.ok) {
			console.error(`[email] ${result.error}`);
			return fail(500, { email, name, error: 'We could not send the email — try again or tell the auctioneer.' });
		}
		return { sent: true, email, existing: Boolean(existing), link: echoMagicLinks() ? link : null };
	}
};
