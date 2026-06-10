// Pure scoring math, shared by the server (leaderboard, state of play) and the
// browser (bid calculator). No database imports here — keep it $lib, not
// $lib/server, so the calculator computes with the exact rules players are
// scored by.

// Group stage points (groups of four), per v1.md: fourth scores nothing,
// third scores one, and the group winner scores 3 — so a team that wins its
// group and is knocked out immediately finishes on 3 points.
const GROUP_POINTS: Record<number, number> = { 4: 0, 3: 1, 2: 2, 1: 3 };

// Each knockout match won adds points on top, climbing with the round and a
// premium for the final itself. A team that tops its group and wins the whole
// tournament scores 3 + 2 + 3 + 4 + 5 + 8 = 25.
const KNOCKOUT_WIN_POINTS = { r32: 2, r16: 3, qf: 4, sf: 5, final: 8 };

export const EXIT_STAGES = [
	{ value: 'r32', label: 'Out in Round of 32' },
	{ value: 'r16', label: 'Out in Round of 16' },
	{ value: 'qf', label: 'Out in Quarter-finals' },
	{ value: 'sf', label: 'Out in Semi-finals' },
	{ value: 'final', label: 'Runners-up' },
	{ value: 'champion', label: 'Champions' }
] as const;

/** Tournament points for a team given its group position and how far it got. */
export function teamPoints(groupPosition: number | null, exitStage: string | null): number {
	let points = groupPosition !== null ? (GROUP_POINTS[groupPosition] ?? 0) : 0;
	if (!exitStage) return points;
	// Points for each knockout round the team won before (or including) its exit.
	if (['r16', 'qf', 'sf', 'final', 'champion'].includes(exitStage))
		points += KNOCKOUT_WIN_POINTS.r32;
	if (['qf', 'sf', 'final', 'champion'].includes(exitStage)) points += KNOCKOUT_WIN_POINTS.r16;
	if (['sf', 'final', 'champion'].includes(exitStage)) points += KNOCKOUT_WIN_POINTS.qf;
	if (['final', 'champion'].includes(exitStage)) points += KNOCKOUT_WIN_POINTS.sf;
	if (exitStage === 'champion') points += KNOCKOUT_WIN_POINTS.final;
	return points;
}

export type OutcomeRung = { exitStage: string | null; label: string; points: number };

/**
 * Every result a team can still achieve from a given group position, worst
 * first. The top two qualify outright; a third-placed team can still sneak
 * into the knockouts (2026 format) or go out; fourth goes home with nothing.
 */
export function outcomeLadder(groupPosition: number): OutcomeRung[] {
	const rungs: OutcomeRung[] = [];
	if (groupPosition >= 3)
		rungs.push({
			exitStage: null,
			label: 'Out in the group stage',
			points: teamPoints(groupPosition, null)
		});
	if (groupPosition <= 3)
		for (const s of EXIT_STAGES)
			rungs.push({ exitStage: s.value, label: s.label, points: teamPoints(groupPosition, s.value) });
	return rungs;
}

/**
 * The fewest tournament points that strictly beat a score at a given price —
 * matching only ties (and ties then rank by raw points). Computed against the
 * same division the leaderboard uses, so floating-point edges can't shave a
 * point off the answer.
 */
export function pointsNeededToBeat(price: number, targetScore: number): number {
	let n = Math.max(0, Math.floor(targetScore * price));
	while (n / price <= targetScore) n++;
	return n;
}

/** The cheapest outcome clearing a points bar, or null if no result is enough. */
export function neededOutcome(points: number, groupPosition: number): OutcomeRung | null {
	return outcomeLadder(groupPosition).find((r) => r.points >= points) ?? null;
}
