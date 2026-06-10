import { db, getSetting } from './db';

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

/** Minutes between the final hammer and kickoff of the first match. */
export function closeMarginMinutes(): number {
	return Number(getSetting('close_margin_minutes'));
}

/** The last lot is hammered this long before kickoff (default two hours). */
export function lastHammerTime(): Date {
	return new Date(kickoffTime().getTime() - closeMarginMinutes() * 60 * 1000);
}

/** True while any lot is still open. */
export function auctionOpen(): boolean {
	return new Date() < lastHammerTime();
}

/**
 * The staggered running order: lots are hammered one at a time in group order
 * (Group A first), alphabetically within a group, one every `intervalMinutes`,
 * with the final lot closing at `lastHammer`.
 */
export function scheduleCloseTimes<T extends { id: number; group_name: string; name: string }>(
	lots: T[],
	lastHammer: Date,
	intervalMinutes: number
): Map<number, Date> {
	const order = [...lots].sort(
		(a, b) => a.group_name.localeCompare(b.group_name) || a.name.localeCompare(b.name)
	);
	const step = intervalMinutes * 60 * 1000;
	return new Map(
		order.map((t, i) => [t.id, new Date(lastHammer.getTime() - (order.length - 1 - i) * step)])
	);
}

function currentSchedule(): Map<number, Date> {
	const lots = db.prepare('SELECT id, group_name, name FROM teams').all() as {
		id: number;
		group_name: string;
		name: string;
	}[];
	return scheduleCloseTimes(lots, lastHammerTime(), staggerMinutes());
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

const TEAM_WITH_BID_SQL = `
	SELECT t.id, t.name, t.flag, t.group_name, t.group_position, t.exit_stage,
		b.amount AS high_bid, b.user_id AS high_bidder_id, u.name AS high_bidder_name,
		(SELECT COUNT(*) FROM bids WHERE team_id = t.id) AS bid_count
	FROM teams t
	LEFT JOIN bids b ON b.id = (
		SELECT id FROM bids WHERE team_id = t.id ORDER BY amount DESC, id ASC LIMIT 1
	)
	LEFT JOIN users u ON u.id = b.user_id
`;

/** All lots in hammer order (the running order of the sale). */
export function listTeamsWithBids(): TeamWithBid[] {
	const schedule = currentSchedule();
	const rows = db
		.prepare(`${TEAM_WITH_BID_SQL} ORDER BY t.group_name, t.name`)
		.all() as Omit<TeamWithBid, 'close_at'>[];
	return rows.map((t) => ({ ...t, close_at: schedule.get(t.id)!.toISOString() }));
}

export function getTeamWithBid(teamId: number): TeamWithBid | undefined {
	const row = db.prepare(`${TEAM_WITH_BID_SQL} WHERE t.id = ?`).get(teamId) as
		| Omit<TeamWithBid, 'close_at'>
		| undefined;
	if (!row) return undefined;
	return { ...row, close_at: currentSchedule().get(row.id)!.toISOString() };
}

/** Teams where this user currently holds the high bid (at most one). */
export function leadingBids(userId: number): TeamWithBid[] {
	return listTeamsWithBids().filter((t) => t.high_bidder_id === userId);
}

export type BidResult = { ok: true } | { ok: false; error: string };

export const placeBid = db.transaction((teamId: number, userId: number, amount: number): BidResult => {
	if (!Number.isInteger(amount) || amount <= 0)
		return { ok: false, error: 'Bids must be a whole number of BonBons.' };

	const team = getTeamWithBid(teamId);
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

	db.prepare('INSERT INTO bids (team_id, user_id, amount) VALUES (?, ?, ?)').run(
		teamId,
		userId,
		amount
	);
	return { ok: true };
});
