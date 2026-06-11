import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { seedTeams } from './seed';

const DATA_DIR = process.env.DATABASE_DIR ?? 'data';
fs.mkdirSync(DATA_DIR, { recursive: true });

export const db = new Database(path.join(DATA_DIR, 'worldcup.sqlite'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	email TEXT NOT NULL UNIQUE,
	name TEXT NOT NULL,
	is_admin INTEGER NOT NULL DEFAULT 0,
	created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
	id TEXT PRIMARY KEY,
	user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	expires_at TEXT NOT NULL
);

-- Single-use magic-link tokens. Only the SHA-256 hash of the token is stored;
-- the emailed link carries the token itself. name is set when the link was
-- requested from the register form, so the account is created on first click.
CREATE TABLE IF NOT EXISTS login_tokens (
	token_hash TEXT PRIMARY KEY,
	email TEXT NOT NULL,
	name TEXT,
	expires_at TEXT NOT NULL,
	created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS teams (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	name TEXT NOT NULL UNIQUE,
	flag TEXT NOT NULL DEFAULT '',
	group_name TEXT NOT NULL DEFAULT 'TBD',
	group_position INTEGER,          -- 1-4 once group stage is complete
	exit_stage TEXT,                 -- r32 | r16 | qf | sf | final | champion
	created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS bids (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
	user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	amount INTEGER NOT NULL,
	created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_bids_team ON bids(team_id, amount DESC);
CREATE INDEX IF NOT EXISTS idx_bids_user ON bids(user_id);

CREATE TABLE IF NOT EXISTS settings (
	key TEXT PRIMARY KEY,
	value TEXT NOT NULL
);

-- One row per notification email ever sent (e.g. lot_won:domain:teamId), so
-- hammer-fall notices go out exactly once even across server restarts.
CREATE TABLE IF NOT EXISTS notifications (
	key TEXT PRIMARY KEY,
	created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

// v2: passwords gave way to emailed magic links; drop the column from v1 databases.
const userColumns = db.prepare('PRAGMA table_info(users)').all() as { name: string }[];
if (userColumns.some((c) => c.name === 'password_hash'))
	db.exec('ALTER TABLE users DROP COLUMN password_hash');

const DEFAULT_SETTINGS: Record<string, string> = {
	// First match: Mexico City, 11 June 2026.
	kickoff: '2026-06-12T02:00:00Z',
	min_opening_bid: '10',
	// Staggered close: the first lot is hammered `first_hammer_lead_minutes`
	// before kickoff of the first match, then one every `stagger_minutes` —
	// 48 lots a minute apart run from an hour out to 13 minutes before kickoff.
	stagger_minutes: '1',
	first_hammer_lead_minutes: '60'
};

// v3: the schedule anchor moved from the last hammer (close_margin_minutes
// before kickoff) to the first (first_hammer_lead_minutes before kickoff).
// The old 5-minute stagger would push the last hammer past kickoff, so it
// tightens to the new default alongside.
if (db.prepare("SELECT 1 FROM settings WHERE key = 'close_margin_minutes'").get()) {
	db.prepare("DELETE FROM settings WHERE key = 'close_margin_minutes'").run();
	db.prepare("UPDATE settings SET value = '1' WHERE key = 'stagger_minutes'").run();
}

const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) insertSetting.run(key, value);

const teamCount = db.prepare('SELECT COUNT(*) AS n FROM teams').get() as { n: number };
if (teamCount.n === 0) {
	const insert = db.prepare('INSERT INTO teams (name, flag, group_name) VALUES (?, ?, ?)');
	const insertAll = db.transaction(() => {
		for (const t of seedTeams) insert.run(t.name, t.flag, t.group);
	});
	insertAll();
}

export function getSetting(key: string): string {
	const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as
		| { value: string }
		| undefined;
	return row?.value ?? DEFAULT_SETTINGS[key] ?? '';
}

export function setSetting(key: string, value: string) {
	db.prepare(
		'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
	).run(key, value);
}
