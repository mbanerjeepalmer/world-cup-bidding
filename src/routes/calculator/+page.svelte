<script lang="ts">
	import {
		outcomeLadder,
		pointsNeededToBeat,
		neededOutcome,
		maxWorthwhileBid
	} from '$lib/points';

	let price = $state(10);
	let position = $state(2);
	let outcomeKey = $state('champion');
	let targetRaw = $state('');

	const ladder = $derived(outcomeLadder(position));
	const rungKey = (r: { exitStage: string | null }) => r.exitStage ?? 'group';

	// A fourth-placed team has no knockout outcomes: when the position change
	// shrinks the ladder, fall back to the best result still on it.
	$effect(() => {
		if (!ladder.some((r) => rungKey(r) === outcomeKey))
			outcomeKey = rungKey(ladder[ladder.length - 1]);
	});

	const rung = $derived(ladder.find((r) => rungKey(r) === outcomeKey) ?? ladder[ladder.length - 1]);
	const validPrice = $derived(Number.isFinite(price) && price > 0);
	const target = $derived(parseFloat(targetRaw));
	const hasTarget = $derived(Number.isFinite(target) && target >= 0);
	const needed = $derived(hasTarget && validPrice ? pointsNeededToBeat(price, target) : null);
	const neededRung = $derived(needed !== null ? neededOutcome(needed, position) : null);
	const maxBid = $derived(hasTarget ? maxWorthwhileBid(rung.points, target) : undefined);
</script>

<h1>Bid calculator</h1>
<p class="muted">
	Points ÷ price, before you raise your paddle. Pick a price and a tournament outcome to see the
	score it buys — then set a score to beat and learn what the team must achieve, and the most
	that outcome is worth paying. See where today's bids stand on the
	<a href="/state-of-play">state of play</a>.
</p>

<div class="columns">
	<div class="panel">
		<h2>What would this bid score?</h2>

		<label for="price">Price (BonBons)</label>
		<input id="price" name="price" type="number" min="1" step="1" bind:value={price} />

		<label for="position">Group finish</label>
		<select id="position" name="position" bind:value={position}>
			<option value={1}>1st in group</option>
			<option value={2}>2nd in group</option>
			<option value={3}>3rd in group</option>
			<option value={4}>4th in group</option>
		</select>

		<label for="outcome">Then…</label>
		<select id="outcome" name="outcome" bind:value={outcomeKey}>
			{#each ladder as r (rungKey(r))}
				<option value={rungKey(r)}>{r.label}</option>
			{/each}
		</select>

		<p class="result">
			<span class="muted">Points</span>
			<strong data-testid="points">{rung.points}</strong>
			<span class="muted">Score</span>
			<strong data-testid="score">{validPrice ? (rung.points / price).toFixed(3) : '—'}</strong>
		</p>
	</div>

	<div class="panel">
		<h2>When is it worth it?</h2>
		<label for="target">Score to beat</label>
		<input
			id="target"
			name="target"
			type="number"
			min="0"
			step="0.001"
			placeholder="e.g. the room's best, 0.300"
			bind:value={targetRaw}
		/>

		{#if hasTarget}
			<p data-testid="needed">
				At <span class="bonbons">{validPrice ? price : '—'}</span> BonBons that takes
				{#if needed !== null}
					<strong>{needed}+ points</strong>
					{#if neededRung}
						— <strong>{neededRung.label}</strong> ({neededRung.points} pts) or better.
					{:else}
						— out of reach from that group finish.
					{/if}
				{:else}
					a valid price first.
				{/if}
			</p>
			<p data-testid="maxbid">
				And {rung.label.toLowerCase()} from {position}{['st', 'nd', 'rd', 'th'][position - 1]} in
				the group ({rung.points} pts) is worth paying
				{#if maxBid === null}
					<strong>any price</strong> — there is no score to beat.
				{:else}
					at most <strong class="bonbons">{maxBid}</strong> BonBons.
				{/if}
			</p>
			<p class="muted">Matching a score only ties — these numbers beat it outright.</p>
		{:else}
			<p class="muted">
				Enter the score you're chasing — the room's best from the leaderboard, or a rival's
				column on the state of play.
			</p>
		{/if}
	</div>
</div>

<style>
	.columns {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1.25rem;
		margin-top: 1.5rem;
	}

	@media (max-width: 760px) {
		.columns {
			grid-template-columns: 1fr;
		}
	}

	.columns h2 {
		margin-top: 0;
	}

	.result {
		display: flex;
		gap: 0.75rem;
		align-items: baseline;
		margin-top: 1.25rem;
	}

	.result strong {
		font-family: var(--serif);
		font-size: 1.6rem;
		color: var(--yellow);
		font-variant-numeric: tabular-nums;
	}
</style>
