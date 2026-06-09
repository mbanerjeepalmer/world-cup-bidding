<script lang="ts">
	let { data } = $props();
</script>

<h1>Leaderboard</h1>
<p class="muted">
	Score is the sum over your teams of tournament points divided by the price paid.
	{#if data.auctionOpen}The auction is still open, so holdings may change.{/if}
</p>

<table>
	<thead>
		<tr>
			<th>#</th>
			<th>Bidder</th>
			<th>Teams</th>
			<th class="num">Spent</th>
			<th class="num">Points</th>
			<th class="num">Score</th>
		</tr>
	</thead>
	<tbody>
		{#each data.board as entry, i (entry.user_id)}
			<tr class:me={entry.user_id === data.user?.id}>
				<td>{i + 1}</td>
				<td>{entry.name}</td>
				<td>
					{#each entry.teams as t (t.id)}
						<a href="/teams/{t.id}" title="{t.name}: {t.points} pts at {t.high_bid}">{t.flag}</a>
					{/each}
					{#if entry.teams.length === 0}<span class="muted">—</span>{/if}
				</td>
				<td class="num bonbons">{entry.spent}</td>
				<td class="num">{entry.points}</td>
				<td class="num"><strong>{entry.score.toFixed(3)}</strong></td>
			</tr>
		{/each}
	</tbody>
</table>

<style>
	tr.me td {
		background: var(--panel-raised);
	}
</style>
