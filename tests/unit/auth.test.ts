import { describe, it, expect, beforeEach } from 'vitest';
import {
	consumeLoginToken,
	createLoginToken,
	emailValid,
	peekLoginToken
} from '../../src/lib/server/auth';
import { db } from '../../src/lib/server/db';

// Registration is open to any domain; the leaderboard groups bidders by it.
describe('emailValid', () => {
	it('accepts well-formed addresses from any domain', () => {
		expect(emailValid('alice@example.com')).toBe(true);
		expect(emailValid('ALICE@EXAMPLE.COM')).toBe(true);
		expect(emailValid('first.last@gmail.com')).toBe(true);
	});

	it('rejects malformed addresses', () => {
		expect(emailValid('')).toBe(false);
		expect(emailValid('example.com')).toBe(false);
		expect(emailValid('a b@example.com')).toBe(false);
		expect(emailValid('@example.com')).toBe(false);
	});
});

describe('magic-link tokens — single use, short lived', () => {
	beforeEach(() => db.exec('DELETE FROM login_tokens'));

	it('peek checks without spending; consume spends exactly once', () => {
		const token = createLoginToken('alice@example.com', 'Alice');
		expect(peekLoginToken(token)).toEqual({ email: 'alice@example.com', name: 'Alice' });
		// Peeking (the confirm page load) must not burn the token.
		expect(consumeLoginToken(token)).toEqual({ email: 'alice@example.com', name: 'Alice' });
		expect(consumeLoginToken(token)).toBeNull();
	});

	it('a fresh token for the same address voids the old one', () => {
		const first = createLoginToken('alice@example.com');
		const second = createLoginToken('alice@example.com');
		expect(consumeLoginToken(first)).toBeNull();
		expect(consumeLoginToken(second)).toEqual({ email: 'alice@example.com', name: null });
	});

	it('rejects expired tokens', () => {
		const token = createLoginToken('alice@example.com');
		db.prepare('UPDATE login_tokens SET expires_at = ?').run('2000-01-01T00:00:00Z');
		expect(consumeLoginToken(token)).toBeNull();
	});

	it('rejects garbage tokens', () => {
		expect(peekLoginToken('not-a-token')).toBeNull();
		expect(consumeLoginToken('not-a-token')).toBeNull();
	});

	it('stores only a hash, never the token itself', () => {
		const token = createLoginToken('alice@example.com');
		const rows = db.prepare('SELECT token_hash FROM login_tokens').all() as {
			token_hash: string;
		}[];
		expect(rows).toHaveLength(1);
		expect(rows[0].token_hash).not.toBe(token);
	});
});
