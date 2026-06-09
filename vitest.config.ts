import { defineConfig } from 'vitest/config';

// Server-side test runner for the pure logic and DB layer. We deliberately do
// NOT load the SvelteKit plugin here: the unit/integration suites import
// `src/lib/server/*` modules directly, so they need no `$lib`/`$app` aliases.
// The e2e suite is driven separately by @playwright/test (see playwright.config.ts).
export default defineConfig({
	test: {
		include: ['tests/{unit,integration}/**/*.test.ts'],
		// Every suite opens the same SQLite file; run files sequentially so the
		// table-truncating resets in one file can't race another.
		fileParallelism: false,
		// Point the DB layer at a throwaway directory before any module imports it.
		env: {
			DATABASE_DIR: './.test-data'
		}
	}
});
