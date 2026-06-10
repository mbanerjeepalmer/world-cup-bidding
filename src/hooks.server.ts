import type { Handle } from '@sveltejs/kit';
import { building } from '$app/environment';
import { getSessionUser } from '$lib/server/auth';
import { syncFromFeed } from '$lib/server/sync';

// Keep fixtures, results and scores current while the server runs: sync once
// at boot and then hourly. Builds also sync (see "build" in package.json).
if (!building) {
	const sync = async () => {
		const result = await syncFromFeed();
		if (!result.ok) console.error(`[sync] ${result.error}`);
	};
	void sync();
	setInterval(sync, 60 * 60 * 1000);
}

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.user = getSessionUser(event.cookies);
	return resolve(event);
};
