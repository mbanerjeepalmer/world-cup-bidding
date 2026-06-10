// Magic-link delivery via Resend (https://resend.com) — one fetch, no SDK.
// Without RESEND_API_KEY the link is printed to the server log instead, which
// is enough for local play. MAGIC_LINK_ECHO=1 additionally surfaces the link
// in the UI — dev and e2e only, since it lets anyone sign in as anyone.

const FROM = () => process.env.EMAIL_FROM ?? 'BonBon Auction <onboarding@resend.dev>';

export const echoMagicLinks = () => process.env.MAGIC_LINK_ECHO === '1';

export type SendOutcome = { ok: true } | { ok: false; error: string };

export async function sendMagicLink(to: string, link: string): Promise<SendOutcome> {
	const key = process.env.RESEND_API_KEY;
	if (!key) {
		console.log(`[email] RESEND_API_KEY not set — sign-in link for ${to}: ${link}`);
		return { ok: true };
	}
	const res = await fetch('https://api.resend.com/emails', {
		method: 'POST',
		headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
		body: JSON.stringify({
			from: FROM(),
			to: [to],
			subject: 'Your paddle — BonBon World Cup Auction',
			text:
				`Step into the saleroom: ${link}\n\n` +
				'The link is good for 20 minutes and signs you in once. ' +
				'If you did not request it, ignore this email.'
		})
	});
	if (!res.ok) return { ok: false, error: `Resend responded ${res.status}: ${await res.text()}` };
	return { ok: true };
}
