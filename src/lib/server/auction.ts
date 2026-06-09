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
};

export function kickoffTime(): Date {
	return new Date(getSetting('kickoff'));
}

/** The auction closes one hour before kickoff of the first match. */
export function auctionCloseTime(): Date {
	return new Date(kickoffTime().getTime() - 60 * 60 * 1000);
}

export function auctionOpen(): boolean {
	return new Date() < auctionCloseTime();
}

export function budget(): number {
	return Number(getSetting('budget'));
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

export function listTeamsWithBids(): TeamWithBid[] {
	return db.prepare(`${TEAM_WITH_BID_SQL} ORDER BY t.name`).all() as TeamWithBid[];
}

export function getTeamWithBid(teamId: number): TeamWithBid | undefined {
	return db.prepare(`${TEAM_WITH_BID_SQL} WHERE t.id = ?`).get(teamId) as
		| TeamWithBid
		| undefined;
}

/** Teams where this user currently holds the high bid. */
export function leadingBids(userId: number): TeamWithBid[] {
	return listTeamsWithBids().filter((t) => t.high_bidder_id === userId);
}

/** BonBons currently committed to high bids (lost bids free the funds back up). */
export function committed(userId: number, excludeTeamId?: number): number {
	return leadingBids(userId)
		.filter((t) => t.id !== excludeTeamId)
		.reduce((sum, t) => sum + (t.high_bid ?? 0), 0);
}

export type BidResult = { ok: true } | { ok: false; error: string };

export const placeBid = db.transaction((teamId: number, userId: number, amount: number): BidResult => {
	if (!auctionOpen()) return { ok: false, error: 'The auction has closed.' };
	if (!Number.isInteger(amount) || amount <= 0)
		return { ok: false, error: 'Bids must be a whole number of BonBons.' };

	const team = getTeamWithBid(teamId);
	if (!team) return { ok: false, error: 'Unknown team.' };
	if (team.high_bidder_id === userId)
		return { ok: false, error: 'You already hold the high bid on this team.' };

	const minimum = minimumNextBid(team.high_bid);
	if (amount < minimum)
		return { ok: false, error: `The minimum bid is ${minimum} BonBons.` };

	const available = budget() - committed(userId, teamId);
	if (amount > available)
		return {
			ok: false,
			error: `That bid exceeds your available funds (${available} BonBons free).`
		};

	db.prepare('INSERT INTO bids (team_id, user_id, amount) VALUES (?, ?, ?)').run(
		teamId,
		userId,
		amount
	);
	return { ok: true };
});
