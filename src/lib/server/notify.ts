import { db } from './db';
import { domainOf, listTeamsWithBids } from './auction';
import { sendLotWon } from './email';

// When a lot's hammer falls the winner gets a "sold to you" email. The close
// times are computed, not stored, so a periodic sweep (hooks.server.ts, every
// minute) compares them to the clock; the notifications table makes each
// notice once-only across restarts.

/** Lots that closed longer ago than this are recorded without emailing —
 * a fresh deploy onto an old database should not announce ancient wins. */
const STALE_MS = 24 * 60 * 60 * 1000;

export async function notifyHammeredLots(origin: string): Promise<void> {
	const domains = db
		.prepare(`SELECT DISTINCT ${domainOf('email')} AS domain FROM users`)
		.all() as { domain: string }[];
	const now = Date.now();

	for (const { domain } of domains) {
		for (const team of listTeamsWithBids(domain)) {
			const closedAt = new Date(team.close_at).getTime();
			if (closedAt > now || team.high_bidder_id === null) continue;

			// INSERT OR IGNORE claims the notification; changes === 0 means a
			// previous sweep already handled it.
			const key = `lot_won:${domain}:${team.id}`;
			const claim = db.prepare('INSERT OR IGNORE INTO notifications (key) VALUES (?)').run(key);
			if (claim.changes === 0) continue;
			if (now - closedAt > STALE_MS) continue;

			const winner = db
				.prepare('SELECT email FROM users WHERE id = ?')
				.get(team.high_bidder_id) as { email: string } | undefined;
			if (!winner) continue;

			const result = await sendLotWon(winner.email, {
				team: team.name,
				flag: team.flag,
				amount: team.high_bid!,
				link: `${origin}/state-of-play`
			});
			if (!result.ok) {
				// Release the claim so the next sweep retries.
				console.error(`[email] lot won (${team.name} → ${winner.email}): ${result.error}`);
				db.prepare('DELETE FROM notifications WHERE key = ?').run(key);
			}
		}
	}
}
