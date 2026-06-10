import { defineConfig, devices } from '@playwright/test';

// Top of the pyramid: a handful of full-stack journeys through a real browser
// against a freshly-seeded SvelteKit server. The webServer boots the dev app on
// a throwaway database so runs are deterministic and isolated from `npm run dev`.
const PORT = 4271;

export default defineConfig({
	testDir: './e2e',
	testMatch: '**/*.e2e.ts',
	timeout: 30_000,
	fullyParallel: false,
	workers: 1,
	use: {
		baseURL: `http://localhost:${PORT}`,
		trace: 'on-first-retry'
	},
	projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
	webServer: {
		// Run against a production build, not the dev server: HMR re-renders the
		// Svelte forms mid-test and reset value-bound inputs, which is dev-only
		// flakiness. A fresh DB per run keeps the journeys deterministic, and
		// WC_FEED_URL points the build/startup sync at a committed feed fixture
		// (real 2026 structure, dates shifted to 2099 so the auction stays open)
		// instead of the network.
		command: `rm -rf .e2e-data && WC_FEED_URL=e2e/fixtures/feed.json DATABASE_DIR=.e2e-data npm run build && WC_FEED_URL=e2e/fixtures/feed.json DATABASE_DIR=.e2e-data PORT=${PORT} ORIGIN=http://localhost:${PORT} node build`,
		port: PORT,
		reuseExistingServer: false,
		timeout: 120_000
	}
});
