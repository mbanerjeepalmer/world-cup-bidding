import { db, setSetting } from '../src/lib/server/db';

/** Wipe every table so each integration test starts from a known empty state. */
export function resetDb() {
	db.exec('DELETE FROM bids; DELETE FROM sessions; DELETE FROM users; DELETE FROM teams;');
}

export function makeUser(name: string, email = `${name.toLowerCase()}@bonhams.com`): number {
	const r = db
		.prepare('INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)')
		.run(email, name, 'salt:deadbeef');
	return Number(r.lastInsertRowid);
}

export function makeTeam(
	name: string,
	opts: { group_position?: number | null; exit_stage?: string | null } = {}
): number {
	const r = db
		.prepare(
			'INSERT INTO teams (name, flag, group_name, group_position, exit_stage) VALUES (?, ?, ?, ?, ?)'
		)
		.run(name, '🏳️', 'A', opts.group_position ?? null, opts.exit_stage ?? null);
	return Number(r.lastInsertRowid);
}

/** Open the auction comfortably (kickoff far in the future). */
export function openAuction() {
	setSetting('kickoff', '2099-01-01T00:00:00Z');
}

/** Close the auction (kickoff in the past). */
export function closeAuction() {
	setSetting('kickoff', '2000-01-01T00:00:00Z');
}
