<script lang="ts">
	import { EXIT_STAGES } from '$lib/points';

	let { data } = $props();

	// Grid rows: every outcome any lot can still reach, worst first.
	const rows = [
		{ exitStage: null as string | null, label: 'Out in the group stage' },
		...EXIT_STAGES.map((s) => ({ exitStage: s.value as string | null, label: s.label }))
	];

	function cell(lot: (typeof data.lots)[number], exitStage: string | null) {
		return lot.ladder.find((r) => r.exitStage === exitStage) ?? null;
	}

	const anyAssumed = $derived(data.lots.some((l) => !l.positionKnown));
</script>

<h1>State of play <span class="domain">@{data.domain}</span></h1>
<p class="muted">
	What every bid in the room needs to be worth it. Each column is a lot at the price its holder
	paid; each row is a tournament outcome and the score (points ÷ price) it would deliver. Try
	your own numbers in the <a href="/calculator">calculator</a>.
</p>

{#if data.mine}
	<div class="panel">
		<h2>Your lot</h2>
		<p>
			You hold {data.mine.flag}
			<strong>{data.mine.name}</strong> at
			<span class="bonbons">{data.mine.high_bid}</span> BonBons — currently
			{data.mine.currentPoints} points, scoring {data.mine.currentScore.toFixed(3)}.
		</p>
		{#if data.need}
			<p>
				To top the room you must beat {data.need.rivalName}'s score of
				<strong>{data.need.rivalScore.toFixed(3)}</strong> — that takes
				<strong>{data.need.points}+ points</strong>:
				{#if data.need.outcome}
					<strong
						>{data.need.outcome.label.toLowerCase()} ({data.need.outcome.points} pts{#if !data.mine.positionKnown}&nbsp;as
							group runner-up{/if})</strong
					>.
				{:else}
					out of reach even as champions at this price.
				{/if}
			</p>
		{:else}
			<p class="muted">No rival holds a lot yet — the room is yours to lose.</p>
		{/if}
	</div>
{:else}
	<p class="muted">
		You hold no lot, so nothing to defend — <a href="/teams">raise your paddle</a> and come back.
	</p>
{/if}

<h2>Outcomes, priced</h2>
{#if data.lots.length === 0}
	<p class="muted">No lot in this room has a bid yet.</p>
{:else}
	<table>
		<thead>
			<tr>
				<th>If they finish…</th>
				{#each data.lots as lot (lot.id)}
					<th class="num" class:mine={lot.high_bidder_id === data.user?.id}>
						{lot.flag} {lot.name}<br />
						<span class="holder">{lot.high_bidder_name} · <span class="bonbons">{lot.high_bid}</span></span>
					</th>
				{/each}
			</tr>
		</thead>
		<tbody>
			{#each rows as row (row.exitStage ?? 'group')}
				<tr>
					<td>{row.label}</td>
					{#each data.lots as lot (lot.id)}
						{@const rung = cell(lot, row.exitStage)}
						<td class="num" class:mine={lot.high_bidder_id === data.user?.id}>
							{#if rung}
								{rung.score.toFixed(3)}
								<span class="pts muted">({rung.points})</span>
							{:else}
								<span class="muted">—</span>
							{/if}
						</td>
					{/each}
				</tr>
			{/each}
		</tbody>
	</table>
	{#if anyAssumed}
		<p class="muted">
			Group standings aren't in yet for every team — unplaced teams are assumed to qualify as
			group runners-up. Winning the group is worth one point more at every rung.
		</p>
	{/if}
{/if}

<style>
	h1 .domain {
		font-size: 1rem;
		letter-spacing: 0.08em;
		color: var(--text-muted);
	}

	.panel {
		margin: 1.5rem 0;
	}

	.panel h2 {
		margin-top: 0;
	}

	th .holder {
		font-weight: 400;
		text-transform: none;
		letter-spacing: normal;
	}

	td .pts {
		font-size: 0.75rem;
	}

	th.mine,
	td.mine {
		background: var(--panel-raised);
	}
</style>
