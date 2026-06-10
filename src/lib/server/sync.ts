import fs from 'node:fs';
import { db, setSetting } from './db';

// Fixtures, results and (via scoring) the leaderboard all come from the
// openfootball World Cup 2026 feed: one keyless JSON file containing every
// match, its group, and — once played — its score. Synced on every build,
// on server start, hourly while the server runs, and on demand from /admin.
const DEFAULT_FEED_URL =
	'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json';

export type FeedMatch = {
	round: string;
	date: string;
	time?: string;
	team1: string;
	team2: string;
	group?: string;
	score1?: number | null;
	score2?: number | null;
	// Extra time / penalty shoot-out totals, present only when they happened.
	score1et?: number | null;
	score2et?: number | null;
	score1p?: number | null;
	score2p?: number | null;
};

export type Feed = { name: string; matches: FeedMatch[] };

// Feed team names that differ from the names our lots were seeded with.
const ALIASES: Record<string, string> = {
	USA: 'United States'
};

// Flags for qualifiers that were play-off placeholders in the original seed.
const FLAGS: Record<string, string> = {
	'Bosnia & Herzegovina': '🇧🇦',
	'Czech Republic': '🇨🇿',
	'DR Congo': '🇨🇩',
	Iraq: '🇮🇶',
	Sweden: '🇸🇪',
	Turkey: '🇹🇷'
};

const dbName = (feedName: string) => ALIASES[feedName] ?? feedName;

/** "13:00 UTC-6" on "2026-06-11" → 2026-06-11T19:00:00Z. */
export function matchKickoff(date: string, time?: string): Date {
	const [y, mo, d] = date.split('-').map(Number);
	const m = time?.match(/^(\d{1,2}):(\d{2})\s+UTC([+-]\d+)$/);
	if (!m) return new Date(Date.UTC(y, mo - 1, d, 12, 0));
	// Local hour minus the offset gives the UTC hour (13:00 at UTC-6 → 19:00Z).
	return new Date(Date.UTC(y, mo - 1, d, Number(m[1]) - Number(m[3]), Number(m[2])));
}

/** Map a feed round name onto our exit stages; null = not a knockout we score. */
export function knockoutStage(round: string): 'r32' | 'r16' | 'qf' | 'sf' | 'final' | null {
	const r = round.toLowerCase();
	if (r.includes('third')) return null; // 3rd-place match never changes an exit stage
	if (r.includes('round of 32')) return 'r32';
	if (r.includes('round of 16')) return 'r16';
	if (r.includes('quarter')) return 'qf';
	if (r.includes('semi')) return 'sf';
	if (r.includes('final')) return 'final';
	return null;
}

function played(m: FeedMatch): boolean {
	return m.score1 != null && m.score2 != null;
}

/** Winner of a knockout match: penalties beat extra time beat full time. */
function winnerOf(m: FeedMatch): string | null {
	for (const [a, b] of [
		[m.score1p, m.score2p],
		[m.score1et, m.score2et],
		[m.score1, m.score2]
	] as const) {
		if (a == null || b == null) continue;
		if (a > b) return m.team1;
		if (b > a) return m.team2;
	}
	return null;
}

export type SyncSummary = {
	teams: number;
	inserted: string[];
	removed: string[];
	groupsScored: number;
	exitsApplied: number;
	kickoff: string;
};

/**
 * Reconcile the database with a feed. Idempotent: group names, group
 * positions and exit stages are recomputed from scratch on every run, so the
 * feed is the source of truth (admin edits survive only until the next sync).
 */
export function syncFromData(feed: Feed): SyncSummary {
	const groupMatches = feed.matches.filter((m) => m.group);
	const roster = new Map<string, string>(); // db team name → group letter
	for (const m of groupMatches) {
		const group = m.group!.replace(/^Group\s+/, '');
		roster.set(dbName(m.team1), group);
		roster.set(dbName(m.team2), group);
	}

	const summary: SyncSummary = {
		teams: roster.size,
		inserted: [],
		removed: [],
		groupsScored: 0,
		exitsApplied: 0,
		kickoff: ''
	};

	const apply = db.transaction(() => {
		// 1. Upsert the roster: update groups, insert newly-known qualifiers.
		const byName = db.prepare('SELECT id FROM teams WHERE name = ?');
		const insert = db.prepare('INSERT INTO teams (name, flag, group_name) VALUES (?, ?, ?)');
		for (const [name, group] of roster) {
			if (byName.get(name)) {
				db.prepare('UPDATE teams SET group_name = ? WHERE name = ?').run(group, name);
			} else {
				insert.run(name, FLAGS[name] ?? '🏳️', group);
				summary.inserted.push(name);
			}
		}

		// 2. Retire lots the roster no longer contains (e.g. play-off
		// placeholders) — but never one somebody has bid on.
		const stale = db
			.prepare(
				`SELECT id, name FROM teams WHERE name NOT IN (${[...roster.keys()].map(() => '?').join(',')})
				 AND NOT EXISTS (SELECT 1 FROM bids WHERE bids.team_id = teams.id)`
			)
			.all(...roster.keys()) as { id: number; name: string }[];
		for (const t of stale) {
			db.prepare('DELETE FROM teams WHERE id = ?').run(t.id);
			summary.removed.push(t.name);
		}

		// 3. Group standings → group_position (1–4), live as results arrive.
		// Tiebreak: points, goal difference, goals scored, then name for
		// stability. (Head-to-head and fair play are not modelled.)
		db.prepare('UPDATE teams SET group_position = NULL').run();
		const groups = new Map<string, string[]>();
		for (const [name, group] of roster) {
			groups.set(group, [...(groups.get(group) ?? []), name]);
		}
		const setPosition = db.prepare('UPDATE teams SET group_position = ? WHERE name = ?');
		for (const [group, names] of groups) {
			const table = new Map(names.map((n) => [n, { pts: 0, gd: 0, gf: 0 }]));
			let playedAny = false;
			for (const m of groupMatches) {
				if (m.group!.replace(/^Group\s+/, '') !== group || !played(m)) continue;
				playedAny = true;
				const home = table.get(dbName(m.team1))!;
				const away = table.get(dbName(m.team2))!;
				home.gf += m.score1!;
				home.gd += m.score1! - m.score2!;
				away.gf += m.score2!;
				away.gd += m.score2! - m.score1!;
				if (m.score1! > m.score2!) home.pts += 3;
				else if (m.score2! > m.score1!) away.pts += 3;
				else {
					home.pts += 1;
					away.pts += 1;
				}
			}
			if (!playedAny) continue;
			summary.groupsScored++;
			const ranked = [...table.entries()].sort(
				([an, a], [bn, b]) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || an.localeCompare(bn)
			);
			ranked.forEach(([name], i) => setPosition.run(i + 1, name));
		}

		// 4. Knockout results → exit stages; the Final's winner is champion.
		db.prepare('UPDATE teams SET exit_stage = NULL').run();
		const setExit = db.prepare('UPDATE teams SET exit_stage = ? WHERE name = ?');
		for (const m of feed.matches) {
			const stage = m.group ? null : knockoutStage(m.round);
			if (!stage || !played(m)) continue;
			const winner = winnerOf(m);
			if (!winner) continue; // level with no shoot-out data — feed not final yet
			const loser = winner === m.team1 ? m.team2 : m.team1;
			if (roster.has(dbName(loser))) {
				setExit.run(stage, dbName(loser));
				summary.exitsApplied++;
			}
			if (stage === 'final' && roster.has(dbName(winner))) {
				setExit.run('champion', dbName(winner));
				summary.exitsApplied++;
			}
		}

		// 5. The earliest fixture sets the kickoff the auction closes before.
		const first = feed.matches
			.map((m) => matchKickoff(m.date, m.time))
			.sort((a, b) => a.getTime() - b.getTime())[0];
		if (first) {
			summary.kickoff = first.toISOString();
			setSetting('kickoff', summary.kickoff);
		}
	});
	apply();

	return summary;
}

export type SyncResult = { ok: true; summary: SyncSummary } | { ok: false; error: string };

/** Load the feed (HTTP URL or local file path via WC_FEED_URL) and sync. */
export async function syncFromFeed(source?: string): Promise<SyncResult> {
	const url = source ?? process.env.WC_FEED_URL ?? DEFAULT_FEED_URL;
	try {
		let raw: string;
		if (/^https?:/.test(url)) {
			const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
			if (!res.ok) return { ok: false, error: `Feed returned HTTP ${res.status}` };
			raw = await res.text();
		} else {
			raw = fs.readFileSync(url, 'utf8');
		}
		const feed = JSON.parse(raw) as Feed;
		if (!Array.isArray(feed.matches)) return { ok: false, error: 'Feed has no matches array' };
		return { ok: true, summary: syncFromData(feed) };
	} catch (e) {
		return { ok: false, error: e instanceof Error ? e.message : String(e) };
	}
}
