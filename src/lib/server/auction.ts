import { db, getSetting } from './db';
import { emailDomain } from './auth';

/** SQL for the email domain of a users column — the tenant key. */
export const domainOf = (col: string) => `substr(${col}, instr(${col}, '@') + 1)`;

export type TeamWithBid = {
	id: number;
	name: string;
	flag: string;
	group_name: string;
	group_position: number | null;
	exit_stage: string | null;
	high_bid: number | null;
	high_bidder_id: number | null;
	high_bidder_name: string | null;
	bid_count: number;
	close_at: string; // ISO — when this lot's hammer falls
};

export function kickoffTime(): Date {
	return new Date(getSetting('kickoff'));
}

/** Minutes between consecutive hammers. */
export function staggerMinutes(): number {
	return Number(getSetting('stagger_minutes'));
}

/** The first lot is hammered this long before kickoff (default one hour). */
export function firstHammerLeadMinutes(): number {
	return Number(getSetting('first_hammer_lead_minutes'));
}

/** When the first lot's hammer falls — the schedule's anchor. */
export function firstHammerTime(): Date {
	return new Date(kickoffTime().getTime() - firstHammerLeadMinutes() * 60 * 1000);
}

/** When the final lot is hammered: the first hammer plus a stagger per remaining lot. */
export function lastHammerTime(): Date {
	const { n } = db.prepare('SELECT COUNT(*) AS n FROM teams').get() as { n: number };
	return new Date(
		firstHammerTime().getTime() + Math.max(0, n - 1) * staggerMinutes() * 60 * 1000
	);
}

/** True while any lot is still open. */
export function auctionOpen(): boolean {
	return new Date() < lastHammerTime();
}

/**
 * The staggered running order: lots are hammered one at a time in group order
 * (Group A first), alphabetically within a group, starting at `firstHammer`
 * and then one every `intervalMinutes`.
 */
export function scheduleCloseTimes<T extends { id: number; group_name: string; name: string }>(
	lots: T[],
	firstHammer: Date,
	intervalMinutes: number
): Map<number, Date> {
	const order = [...lots].sort(
		(a, b) => a.group_name.localeCompare(b.group_name) || a.name.localeCompare(b.name)
	);
	const step = intervalMinutes * 60 * 1000;
	return new Map(order.map((t, i) => [t.id, new Date(firstHammer.getTime() + i * step)]));
}

function currentSchedule(): Map<number, Date> {
	const lots = db.prepare('SELECT id, group_name, name FROM teams').all() as {
		id: number;
		group_name: string;
		name: string;
	}[];
	return scheduleCloseTimes(lots, firstHammerTime(), staggerMinutes());
}

export function lotOpen(team: Pick<TeamWithBid, 'close_at'>): boolean {
	return new Date() < new Date(team.close_at);
}

export function minOpeningBid(): number {
	return Number(getSetting('min_opening_bid'));
}

/** Standard auction-house bidding increments. */
export function increment(currentBid: number): number {
	if (currentBid < 100) return 5;
	if (currentBid < 200) return 10;
	if (currentBid < 500) return 25;
	if (currentBid < 1000) return 50;
	if (currentBid < 2000) return 100;
	if (currentBid < 5000) return 250;
	return 500;
}

export function minimumNextBid(currentBid: number | null): number {
	if (currentBid === null) return minOpeningBid();
	return currentBid + increment(currentBid);
}

// Each email domain is a separate tenant running its own sale over the same
// lots, so the high bid and bid count only count bids from that domain.
const TEAM_WITH_BID_SQL = `
	SELECT t.id, t.name, t.flag, t.group_name, t.group_position, t.exit_stage,
		b.amount AS high_bid, b.user_id AS high_bidder_id, u.name AS high_bidder_name,
		(SELECT COUNT(*) FROM bids bb JOIN users bu ON bu.id = bb.user_id
		 WHERE bb.team_id = t.id AND ${domainOf('bu.email')} = :domain) AS bid_count
	FROM teams t
	LEFT JOIN bids b ON b.id = (
		SELECT bb.id FROM bids bb JOIN users bu ON bu.id = bb.user_id
		WHERE bb.team_id = t.id AND ${domainOf('bu.email')} = :domain
		ORDER BY bb.amount DESC, bb.id ASC LIMIT 1
	)
	LEFT JOIN users u ON u.id = b.user_id
`;

/** All lots in hammer order (the running order of the sale), as one tenant sees them. */
export function listTeamsWithBids(domain: string): TeamWithBid[] {
	const schedule = currentSchedule();
	const rows = db
		.prepare(`${TEAM_WITH_BID_SQL} ORDER BY t.group_name, t.name`)
		.all({ domain }) as Omit<TeamWithBid, 'close_at'>[];
	return rows.map((t) => ({ ...t, close_at: schedule.get(t.id)!.toISOString() }));
}

export function getTeamWithBid(teamId: number, domain: string): TeamWithBid | undefined {
	const row = db.prepare(`${TEAM_WITH_BID_SQL} WHERE t.id = :id`).get({ id: teamId, domain }) as
		| Omit<TeamWithBid, 'close_at'>
		| undefined;
	if (!row) return undefined;
	return { ...row, close_at: currentSchedule().get(row.id)!.toISOString() };
}

/** The tenant a user bids in — the domain of their email address. */
export function userDomain(userId: number): string {
	const row = db.prepare('SELECT email FROM users WHERE id = ?').get(userId) as
		| { email: string }
		| undefined;
	return row ? emailDomain(row.email) : '';
}

/** Teams where this user currently holds the high bid in their tenant (at most one). */
export function leadingBids(userId: number): TeamWithBid[] {
	return listTeamsWithBids(userDomain(userId)).filter((t) => t.high_bidder_id === userId);
}

/** Who lost the high bid when a bid lands, so the caller can notify them. */
export type OutbidBidder = { email: string; name: string };

export type BidResult = { ok: true; outbid: OutbidBidder | null } | { ok: false; error: string };

export const placeBid = db.transaction((teamId: number, userId: number, amount: number): BidResult => {
	if (!Number.isInteger(amount) || amount <= 0)
		return { ok: false, error: 'Bids must be a whole number of BonBons.' };

	// All checks run inside the bidder's tenant: another domain's bids never
	// set the minimum here, and never get outbid from here.
	const team = getTeamWithBid(teamId, userDomain(userId));
	if (!team) return { ok: false, error: 'Unknown team.' };
	if (!lotOpen(team)) return { ok: false, error: 'The hammer has fallen on this lot.' };
	if (team.high_bidder_id === userId)
		return { ok: false, error: 'You already hold the high bid on this team.' };

	const minimum = minimumNextBid(team.high_bid);
	if (amount < minimum)
		return { ok: false, error: `The minimum bid is ${minimum} BonBons.` };

	// One team per bidder: you may only lead a single lot. Bid as high as you
	// dare — every BonBon divides your points at the end. If you are outbid
	// elsewhere you are free to bid here; once a lot you lead has been hammered,
	// that team is yours and your auction is over.
	const held = leadingBids(userId).find((t) => t.id !== teamId);
	if (held)
		return {
			ok: false,
			error: lotOpen(held)
				? `You already hold the high bid on ${held.name} — one team per bidder. You can bid here if someone outbids you there.`
				: `${held.name} is your team for the tournament — the hammer has fallen on it.`
		};

	// The bidder being deposed, captured before the insert that deposes them.
	const previous = team.high_bidder_id
		? (db.prepare('SELECT email, name FROM users WHERE id = ?').get(team.high_bidder_id) as
				| OutbidBidder
				| undefined)
		: undefined;

	db.prepare('INSERT INTO bids (team_id, user_id, amount) VALUES (?, ?, ?)').run(
		teamId,
		userId,
		amount
	);
	return { ok: true, outbid: previous ?? null };
});
