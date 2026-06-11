import type { PageServerLoad } from './$types';
import { firstHammerLeadMinutes, firstHammerTime, staggerMinutes } from '$lib/server/auction';

export const load: PageServerLoad = () => {
	return {
		staggerMinutes: staggerMinutes(),
		firstHammerLeadMinutes: firstHammerLeadMinutes(),
		firstHammer: firstHammerTime().toISOString()
	};
};
