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
const ALLOWED_DOMAIN = 'bonhams.com';

export function emailAllowed(email: string): boolean {
	return /^[^\s@]+@[^\s@]+$/.test(email) && email.toLowerCase().endsWith(`@${ALLOWED_DOMAIN}`);
}

export function hashPassword(password: string): string {
	const salt = crypto.randomBytes(16).toString('hex');
	const hash = crypto.scryptSync(password, salt, 64).toString('hex');
	return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
	const [salt, hash] = stored.split(':');
	if (!salt || !hash) return false;
	const candidate = crypto.scryptSync(password, salt, 64);
	return crypto.timingSafeEqual(candidate, Buffer.from(hash, 'hex'));
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
