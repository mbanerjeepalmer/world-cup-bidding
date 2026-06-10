import type { PageServerLoad } from './$types';
import { closeMarginMinutes, staggerMinutes } from '$lib/server/auction';

export const load: PageServerLoad = () => {
	return { staggerMinutes: staggerMinutes(), closeMarginMinutes: closeMarginMinutes() };
};
