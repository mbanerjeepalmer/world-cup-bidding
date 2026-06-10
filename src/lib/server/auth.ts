import crypto from 'node:crypto';
import type { Cookies } from '@sveltejs/kit';
import { db } from './db';

export type User = {
	id: number;
	email: string;
	name: string;
	is_admin: number;
};

const SESSION_COOKIE = 'session';
const SESSION_DAYS = 30;

// Registration is open to any domain; each domain is its own tenant.
export function emailValid(email: string): boolean {
	return /^[^\s@]+@[^\s@]+$/.test(email);
}

/** The tenant key: bidders only ever see the auction on their own domain. */
export function emailDomain(email: string): string {
	return email.split('@')[1]?.toLowerCase() ?? '';
}

const TOKEN_MINUTES = 20;

function tokenHash(token: string): string {
	return crypto.createHash('sha256').update(token).digest('hex');
}

export type LoginToken = { email: string; name: string | null };

/**
 * Mint a single-use sign-in token for this address; any earlier one is voided.
 * `name` is carried for registrations so the account is only created once the
 * link is clicked. Only the hash is stored — the emailed link holds the token.
 */
export function createLoginToken(email: string, name: string | null = null): string {
	const token = crypto.randomBytes(32).toString('hex');
	const expires = new Date(Date.now() + TOKEN_MINUTES * 60 * 1000);
	db.prepare('DELETE FROM login_tokens WHERE email = ?').run(email);
	db.prepare(
		'INSERT INTO login_tokens (token_hash, email, name, expires_at) VALUES (?, ?, ?, ?)'
	).run(tokenHash(token), email, name, expires.toISOString());
	return token;
}

/** Check a token without spending it — the verify page peeks before the user confirms. */
export function peekLoginToken(token: string): LoginToken | null {
	const row = db
		.prepare('SELECT email, name, expires_at FROM login_tokens WHERE token_hash = ?')
		.get(tokenHash(token)) as
		| { email: string; name: string | null; expires_at: string }
		| undefined;
	if (!row || new Date(row.expires_at) < new Date()) return null;
	return { email: row.email, name: row.name };
}

/** Spend a token: valid once, then gone. */
export function consumeLoginToken(token: string): LoginToken | null {
	const found = peekLoginToken(token);
	db.prepare('DELETE FROM login_tokens WHERE token_hash = ?').run(tokenHash(token));
	return found;
}

export function createSession(cookies: Cookies, userId: number) {
	const id = crypto.randomBytes(32).toString('hex');
	const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
	db.prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)').run(
		id,
		userId,
		expires.toISOString()
	);
	cookies.set(SESSION_COOKIE, id, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		expires
	});
}

export function destroySession(cookies: Cookies) {
	const id = cookies.get(SESSION_COOKIE);
	if (id) db.prepare('DELETE FROM sessions WHERE id = ?').run(id);
	cookies.delete(SESSION_COOKIE, { path: '/' });
}

export function getSessionUser(cookies: Cookies): User | null {
	const id = cookies.get(SESSION_COOKIE);
	if (!id) return null;
	const row = db
		.prepare(
			`SELECT u.id, u.email, u.name, u.is_admin, s.expires_at
			 FROM sessions s JOIN users u ON u.id = s.user_id
			 WHERE s.id = ?`
		)
		.get(id) as (User & { expires_at: string }) | undefined;
	if (!row) return null;
	if (new Date(row.expires_at) < new Date()) {
		db.prepare('DELETE FROM sessions WHERE id = ?').run(id);
		return null;
	}
	return { id: row.id, email: row.email, name: row.name, is_admin: row.is_admin };
}
