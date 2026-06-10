// Build-time fixture/result sync, run via vite-node (see "sync" in package.json).
// Failures are logged but never fail the build: a deploy with a stale leaderboard
// beats no deploy, and the server retries hourly anyway.
import { syncFromFeed } from '../src/lib/server/sync';

const result = await syncFromFeed();
if (result.ok) {
	const s = result.summary;
	console.log(
		`[sync] ${s.teams} teams (${s.inserted.length} new, ${s.removed.length} retired), ` +
			`${s.groupsScored} groups scored, ${s.exitsApplied} knockout exits, kickoff ${s.kickoff}`
	);
} else {
	console.error(`[sync] skipped: ${result.error}`);
}
