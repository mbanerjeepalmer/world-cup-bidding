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

		if (!emailValid(email))
			return fail(400, { email, error: 'Please enter a valid email address.' });
		const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
		if (!user)
			return fail(400, { email, error: 'No paddle is registered to that address — register first.' });

		const link = `${url.origin}/auth/${createLoginToken(email)}`;
		const result = await sendMagicLink(email, link);
		if (!result.ok) {
			console.error(`[email] ${result.error}`);
			return fail(500, { email, error: 'We could not send the email — try again or tell the auctioneer.' });
		}
		// delivered is false when the server has no RESEND_API_KEY: the link only
		// went to the server log, and the page must not claim an email was sent.
		return { sent: true, delivered: result.delivered, email, link: echoMagicLinks() ? link : null };
	}
};
