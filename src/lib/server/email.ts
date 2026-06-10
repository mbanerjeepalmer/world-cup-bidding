// Email delivery via Resend (https://resend.com) — one fetch, no SDK.
// Without RESEND_API_KEY nothing is sent: the message is printed to the server
// log and the outcome carries `delivered: false`, so callers can tell the user
// the truth instead of claiming an email went out. MAGIC_LINK_ECHO=1
// additionally surfaces sign-in links in the UI — dev and e2e only, since it
// lets anyone sign in as anyone.

const FROM = () => process.env.EMAIL_FROM ?? 'BonBon Auction <world-cup@outbound-mail.bnqt.app>';

export const echoMagicLinks = () => process.env.MAGIC_LINK_ECHO === '1';

export type SendOutcome = { ok: true; delivered: boolean } | { ok: false; error: string };

type Message = { to: string; subject: string; text: string; html: string };

export async function sendEmail({ to, subject, text, html }: Message): Promise<SendOutcome> {
	const key = process.env.RESEND_API_KEY;
	if (!key) {
		console.log(`[email] RESEND_API_KEY not set — NOT sending "${subject}" to ${to}:\n${text}`);
		return { ok: true, delivered: false };
	}
	let res: Response;
	try {
		res = await fetch('https://api.resend.com/emails', {
			method: 'POST',
			headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
			body: JSON.stringify({ from: FROM(), to: [to], subject, text, html })
		});
	} catch (e) {
		return { ok: false, error: `Resend unreachable: ${e instanceof Error ? e.message : e}` };
	}
	if (!res.ok) return { ok: false, error: `Resend responded ${res.status}: ${await res.text()}` };
	return { ok: true, delivered: true };
}

// --- HTML template -----------------------------------------------------------
// Same look as the app: near-black canvas, yellow accents, serif headings.
// Inline styles throughout — email clients strip <style> blocks.

const Y = '#ffd400';
const BLACK = '#0d0d0d';
const PANEL = '#161616';
const BORDER = '#2c2c2c';
const TEXT = '#f2f0eb';
const MUTED = '#9a968c';

type Template = {
	heading: string;
	/** Already-escaped HTML paragraphs. */
	paragraphs: string[];
	cta?: { label: string; href: string };
	footnote?: string;
};

export function escapeHtml(s: string): string {
	return s
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;');
}

function renderHtml({ heading, paragraphs, cta, footnote }: Template): string {
	const body = paragraphs
		.map((p) => `<p style="margin:0 0 1em;color:${TEXT};font-size:15px;line-height:1.6;">${p}</p>`)
		.join('\n');
	const button = cta
		? `<p style="margin:1.5em 0;"><a href="${cta.href}" style="display:inline-block;background:${Y};color:${BLACK};font-weight:700;text-decoration:none;padding:12px 28px;border-radius:4px;">${escapeHtml(cta.label)}</a></p>`
		: '';
	const note = footnote
		? `<p style="margin:1.5em 0 0;color:${MUTED};font-size:13px;line-height:1.6;">${footnote}</p>`
		: '';
	return `<!doctype html>
<html>
<body style="margin:0;padding:0;background:${BLACK};font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
	<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BLACK};">
		<tr><td align="center" style="padding:32px 16px;">
			<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
				<tr><td style="padding:0 8px 16px;">
					<span style="font-family:Didot,'Bodoni MT',Georgia,serif;font-size:20px;letter-spacing:0.18em;color:${Y};">BONBON</span>
					<span style="font-size:11px;letter-spacing:0.12em;color:${MUTED};text-transform:uppercase;">&nbsp;World Cup Auction</span>
				</td></tr>
				<tr><td style="background:${PANEL};border:1px solid ${BORDER};border-radius:6px;padding:28px 32px;">
					<h1 style="margin:0 0 0.75em;font-family:Didot,'Bodoni MT',Georgia,serif;font-weight:500;font-size:24px;line-height:1.25;color:${TEXT};">${heading}</h1>
					${body}
					${button}
					${note}
				</td></tr>
				<tr><td style="padding:16px 8px;color:${MUTED};font-size:12px;line-height:1.6;">
					The BonBon World Cup Auction — each email domain is its own sale room.
				</td></tr>
			</table>
		</td></tr>
	</table>
</body>
</html>`;
}

// --- The emails the auction house sends --------------------------------------

export async function sendMagicLink(to: string, link: string): Promise<SendOutcome> {
	return sendEmail({
		to,
		subject: 'Your paddle — BonBon World Cup Auction',
		text:
			`Step into the saleroom: ${link}\n\n` +
			'The link is good for 20 minutes and signs you in once. ' +
			'If you did not request it, ignore this email.',
		html: renderHtml({
			heading: 'Step into the saleroom',
			paragraphs: ['Your sign-in link is ready. It is good for 20 minutes and signs you in once.'],
			cta: { label: 'Take your paddle', href: link },
			footnote: 'If you did not request it, ignore this email.'
		})
	});
}

export type LotDetails = { team: string; flag: string; amount: number; link: string };

export async function sendOutbidNotice(to: string, lot: LotDetails): Promise<SendOutcome> {
	const team = escapeHtml(lot.team);
	return sendEmail({
		to,
		subject: `Outbid on ${lot.flag} ${lot.team}`,
		text:
			`Another paddle has gone up: ${lot.team} now stands at ${lot.amount} BonBons.\n\n` +
			`Bid again, or pick another lot, before the hammer falls: ${lot.link}`,
		html: renderHtml({
			heading: `${lot.flag} ${team} has slipped away`,
			paragraphs: [
				`Another paddle has gone up — <strong style="color:${Y};">${team}</strong> now stands at <strong style="color:${Y};">${lot.amount} BonBons</strong>.`,
				'You are free to bid again, or to chase a different lot entirely. The cheaper the glory, the higher you rank.'
			],
			cta: { label: 'Return to the saleroom', href: lot.link },
			footnote: 'You receive this because you held the high bid on this lot.'
		})
	});
}

export async function sendLotWon(to: string, lot: LotDetails): Promise<SendOutcome> {
	const team = escapeHtml(lot.team);
	return sendEmail({
		to,
		subject: `Sold — ${lot.flag} ${lot.team} is yours`,
		text:
			`The hammer has fallen: ${lot.team} is yours for ${lot.amount} BonBons.\n\n` +
			`Your auction is over — now the tournament decides your score. Follow it here: ${lot.link}`,
		html: renderHtml({
			heading: `Sold! ${lot.flag} ${team} is yours`,
			paragraphs: [
				`The hammer has fallen at <strong style="color:${Y};">${lot.amount} BonBons</strong>. Your auction is over.`,
				'From here the tournament decides everything: your score is the points your team earns divided by what you paid.'
			],
			cta: { label: 'Follow the state of play', href: lot.link },
			footnote: 'Good luck. May your bargain go all the way.'
		})
	});
}
