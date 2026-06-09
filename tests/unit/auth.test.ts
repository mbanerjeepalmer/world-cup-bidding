import { describe, it, expect } from 'vitest';
import { emailAllowed, hashPassword, verifyPassword } from '../../src/lib/server/auth';

// v1.md: "Limit signups to people with bonhams.com email addresses."
describe('emailAllowed — bonhams.com gate', () => {
	it('accepts bonhams.com addresses (case-insensitively)', () => {
		expect(emailAllowed('alice@bonhams.com')).toBe(true);
		expect(emailAllowed('ALICE@BONHAMS.COM')).toBe(true);
		expect(emailAllowed('first.last@bonhams.com')).toBe(true);
	});

	it('rejects any other domain', () => {
		expect(emailAllowed('someone@gmail.com')).toBe(false);
		expect(emailAllowed('someone@bonhams.com.evil.com')).toBe(false);
		expect(emailAllowed('someone@notbonhams.com')).toBe(false);
	});

	it('rejects malformed addresses', () => {
		expect(emailAllowed('')).toBe(false);
		expect(emailAllowed('bonhams.com')).toBe(false);
		expect(emailAllowed('a b@bonhams.com')).toBe(false);
		expect(emailAllowed('@bonhams.com')).toBe(false);
	});
});

describe('password hashing', () => {
	it('round-trips a correct password and salts uniquely', () => {
		const a = hashPassword('correct horse battery');
		const b = hashPassword('correct horse battery');
		expect(a).not.toBe(b); // distinct salts
		expect(verifyPassword('correct horse battery', a)).toBe(true);
		expect(verifyPassword('correct horse battery', b)).toBe(true);
	});

	it('rejects the wrong password', () => {
		const stored = hashPassword('correct horse battery');
		expect(verifyPassword('wrong password', stored)).toBe(false);
	});

	it('does not throw on a malformed stored hash', () => {
		expect(verifyPassword('anything', 'garbage')).toBe(false);
	});
});
