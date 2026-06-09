<script lang="ts">
	let { data } = $props();

	const spent = $derived(data.leading.reduce((s, t) => s + (t.high_bid ?? 0), 0));
	const totalScore = $derived(data.leading.reduce((s, t) => s + t.score, 0));
</script>

<h1>My lots</h1>
<p class="muted">
	{#if data.auctionOpen}
		High bids you currently hold. If the hammer fell now, these would be yours.
	{:else}
		Your teams for the tournament.
	{/if}
	Committed: <span class="bonbons">{spent}</span> of <span class="bonbons">{data.budget}</span> BonBons.
</p>

{#if data.leading.length === 0}
	<p class="muted">Nothing yet. <a href="/teams">Raise your paddle.</a></p>
{:else}
	<table>
		<thead>
			<tr>
				<th>Team</th>
				<th class="num">Price</th>
				<th class="num">Points</th>
				<th class="num">Score (pts ÷ price)</th>
			</tr>
		</thead>
		<tbody>
			{#each data.leading as t (t.id)}
				<tr>
					<td><a href="/teams/{t.id}">{t.flag} {t.name}</a></td>
					<td class="num bonbons">{t.high_bid}</td>
					<td class="num">{t.points}</td>
					<td class="num">{t.score.toFixed(3)}</td>
				</tr>
			{/each}
			<tr>
				<td><strong>Total</strong></td>
				<td class="num bonbons"><strong>{spent}</strong></td>
				<td class="num"><strong>{data.leading.reduce((s, t) => s + t.points, 0)}</strong></td>
				<td class="num"><strong>{totalScore.toFixed(3)}</strong></td>
			</tr>
		</tbody>
	</table>
{/if}

{#if data.outbid.length > 0 && data.auctionOpen}
	<h2>Outbid</h2>
	<p class="muted">You bid on these but no longer hold them:</p>
	<ul>
		{#each data.outbid as t (t.id)}
			<li><a href="/teams/{t.id}">{t.flag} {t.name}</a></li>
		{/each}
	</ul>
{/if}
